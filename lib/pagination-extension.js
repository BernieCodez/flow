import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const PAGINATION_PLUGIN_KEY = new PluginKey("flowPagination");
const PAGINATION_META = "flowPaginationBreaks";
const GAP_SELECTOR = "[data-pagination-gap]";
const EPSILON = 0.75;

function numberFromStyle(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function lineHeightFor(element) {
  const style = element.ownerDocument.defaultView.getComputedStyle(element);
  const fontSize = numberFromStyle(style.fontSize, 16);
  return numberFromStyle(style.lineHeight, fontSize * 1.2);
}

function elementForNode(view, pos) {
  let dom = view.nodeDOM(pos);
  if (dom?.nodeType === 3) dom = dom.parentElement;
  return dom?.nodeType === 1 ? dom : null;
}

function topLevelBlocks(view) {
  const blocks = [];

  view.state.doc.forEach((node, pos) => {
    const element = elementForNode(view, pos);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const style = element.ownerDocument.defaultView.getComputedStyle(element);
    blocks.push({
      node,
      pos,
      element,
      top: rect.top,
      bottom: rect.bottom + numberFromStyle(style.marginBottom),
      contentBottom: rect.bottom,
    });
  });

  return blocks;
}

function coordinatesAt(view, pos, side = 1) {
  try {
    return view.coordsAtPos(pos, side);
  } catch {
    return null;
  }
}

/**
 * Find the first visual line that does not fit. The returned document
 * position is at the beginning of that line, so the page decoration never
 * cuts a rendered line in half.
 */
function findTextLineBreak(view, block, contentBottom, minimumPos) {
  const contentStart = block.pos + 1;
  const contentEnd = contentStart + block.node.content.size;
  const searchStart = Math.max(contentStart, minimumPos || contentStart);
  if (searchStart >= contentEnd) return null;

  let low = searchStart;
  let high = contentEnd;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const coordinates = coordinatesAt(view, middle, 1);
    if (!coordinates) return null;

    if (coordinates.bottom <= contentBottom + EPSILON) low = middle + 1;
    else high = middle;
  }

  const overflowing = coordinatesAt(view, low, 1);
  if (!overflowing || overflowing.bottom <= contentBottom + EPSILON) {
    return null;
  }

  const overflowingLineTop = overflowing.top;
  let lineLow = searchStart;
  let lineHigh = low;

  // Positions on a rendered line have the same top coordinate. Locate the
  // first position on the overflowing line rather than splitting mid-line.
  while (lineLow < lineHigh) {
    const middle = Math.floor((lineLow + lineHigh) / 2);
    const coordinates = coordinatesAt(view, middle, 1);
    if (!coordinates) return null;

    if (coordinates.top < overflowingLineTop - EPSILON) lineLow = middle + 1;
    else lineHigh = middle;
  }

  const position = lineLow;
  if (position <= contentStart || position >= contentEnd) return null;

  const coordinates = coordinatesAt(view, position, 1) || overflowing;
  return { pos: position, flowY: coordinates.top };
}

function breakAfterBlock(blocks, index) {
  if (index >= blocks.length - 1) return null;
  const block = blocks[index];
  return {
    pos: block.pos + block.node.nodeSize,
    flowY: block.bottom,
  };
}

function findNextBreak(
  view,
  blocks,
  pageStart,
  contentBottom,
  previousPosition,
  options,
) {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.bottom <= pageStart + EPSILON) continue;
    if (block.bottom <= contentBottom + EPSILON) continue;

    const beginsOnThisPage = block.top >= pageStart - EPSILON;
    const hasContentBeforeBlock = block.top > pageStart + EPSILON;

    if (block.node.isTextblock) {
      const lineHeight = lineHeightFor(block.element);
      const blockLines = Math.max(
        1,
        Math.ceil((block.contentBottom - block.top) / lineHeight),
      );
      const linesThatFit = Math.max(
        0,
        Math.floor((contentBottom - block.top) / lineHeight),
      );
      const shouldKeepWhole =
        beginsOnThisPage &&
        hasContentBeforeBlock &&
        (blockLines <= options.shortParagraphMaxLines ||
          linesThatFit < options.minLinesBeforeSplit);

      if (shouldKeepWhole) {
        return { pos: block.pos, flowY: block.top };
      }

      const split = findTextLineBreak(
        view,
        block,
        contentBottom,
        Math.max(previousPosition + 1, block.pos + 1),
      );
      if (split) {
        const linesBeforeSplit = Math.max(
          0,
          Math.round((split.flowY - Math.max(pageStart, block.top)) / lineHeight),
        );

        if (
          beginsOnThisPage &&
          hasContentBeforeBlock &&
          linesBeforeSplit < options.minLinesBeforeSplit
        ) {
          return { pos: block.pos, flowY: block.top };
        }

        return split;
      }

      // A textblock that starts later on the page should still move as one
      // unit when browser coordinates cannot provide a safe line boundary.
      if (hasContentBeforeBlock) {
        return { pos: block.pos, flowY: block.top };
      }

      return breakAfterBlock(blocks, index);
    }

    // Lists and other compound nodes move as a unit. An object taller than a
    // page is allowed to occupy a page by itself so pagination always settles.
    if (hasContentBeforeBlock) {
      return { pos: block.pos, flowY: block.top };
    }

    return breakAfterBlock(blocks, index);
  }

  return null;
}

function temporarilyHideGaps(view, measure) {
  const gaps = Array.from(view.dom.querySelectorAll(GAP_SELECTOR));
  const previousDisplays = gaps.map((gap) => gap.style.display);

  for (const gap of gaps) gap.style.setProperty("display", "none", "important");
  // Force the browser to expose the continuous, unpaginated geometry before
  // reading any node or caret rectangles.
  void view.dom.offsetHeight;

  try {
    return measure();
  } finally {
    gaps.forEach((gap, index) => {
      if (previousDisplays[index]) gap.style.display = previousDisplays[index];
      else gap.style.removeProperty("display");
    });
  }
}

function measureBreaks(view, options) {
  return temporarilyHideGaps(view, () => {
    const editorRect = view.dom.getBoundingClientRect();
    const editorStyle = view.dom.ownerDocument.defaultView.getComputedStyle(
      view.dom,
    );
    const contentTop =
      editorRect.top +
      numberFromStyle(editorStyle.borderTopWidth) +
      options.pagePaddingTop;
    const contentHeight =
      options.pageHeight - options.pagePaddingTop - options.pagePaddingBottom;
    const pagePitch = options.pageHeight + options.pageGap;
    const blocks = topLevelBlocks(view);
    const logicalBreaks = [];
    let pageStart = contentTop;
    let previousPosition = -1;

    for (let pageIndex = 0; pageIndex < options.maxPages - 1; pageIndex += 1) {
      const next = findNextBreak(
        view,
        blocks,
        pageStart,
        pageStart + contentHeight,
        previousPosition,
        options,
      );

      if (!next) break;
      if (
        next.pos <= previousPosition ||
        next.flowY <= pageStart + EPSILON ||
        next.pos < 0 ||
        next.pos > view.state.doc.content.size
      ) {
        break;
      }

      logicalBreaks.push(next);
      previousPosition = next.pos;
      pageStart = next.flowY;
    }

    let insertedHeight = 0;
    return logicalBreaks.map((pageBreak, index) => {
      const visualBreakY = pageBreak.flowY + insertedHeight;
      const pageTop =
        contentTop - options.pagePaddingTop + index * pagePitch;
      const pageBottom = pageTop + options.pageHeight;
      const nextContentTop = contentTop + (index + 1) * pagePitch;
      const height = Math.max(
        options.pageGap + options.pagePaddingTop,
        nextContentTop - visualBreakY,
      );
      const paperBeforeGap = Math.max(0, pageBottom - visualBreakY);

      insertedHeight += height;
      return {
        pos: pageBreak.pos,
        height,
        paperBeforeGap: Math.min(paperBeforeGap, height - options.pageGap),
      };
    });
  });
}

function createGapElement(view, pageBreak, pageIndex, options) {
  const element = view.dom.ownerDocument.createElement("span");
  element.className = "pagination-gap";
  element.setAttribute("data-pagination-gap", "true");
  element.setAttribute("data-page-after", String(pageIndex + 1));
  element.setAttribute("contenteditable", "false");
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("role", "presentation");
  element.style.setProperty(
    "--pagination-gap-height",
    `${pageBreak.height.toFixed(2)}px`,
  );
  element.style.setProperty(
    "--pagination-paper-before-gap",
    `${pageBreak.paperBeforeGap.toFixed(2)}px`,
  );
  element.style.setProperty("--pagination-page-gap", `${options.pageGap}px`);
  return element;
}

function buildDecorationState(doc, breaks, options) {
  const safeBreaks = breaks.filter(
    (pageBreak) => pageBreak.pos >= 0 && pageBreak.pos <= doc.content.size,
  );
  const decorations = safeBreaks.map((pageBreak, index) =>
    Decoration.widget(
      pageBreak.pos,
      (view) => createGapElement(view, pageBreak, index, options),
      {
        key: [
          "flow-page-gap",
          index,
          pageBreak.pos,
          Math.round(pageBreak.height * 10),
        ].join("-"),
        side: -1,
        relaxedSide: true,
        ignoreSelection: true,
        marks: [],
      },
    ),
  );

  return {
    breaks: safeBreaks,
    decorations: DecorationSet.create(doc, decorations),
  };
}

function mappedDecorationState(transaction, paginationState, options) {
  const breaks = paginationState.breaks
    .map((pageBreak) => ({
      ...pageBreak,
      pos: transaction.mapping.map(pageBreak.pos, -1),
    }))
    .filter(
      (pageBreak) =>
        pageBreak.pos >= 0 && pageBreak.pos <= transaction.doc.content.size,
    );

  return buildDecorationState(transaction.doc, breaks, options);
}

function equivalentBreaks(left, right) {
  if (left.length !== right.length) return false;

  return left.every(
    (pageBreak, index) =>
      pageBreak.pos === right[index].pos &&
      Math.abs(pageBreak.height - right[index].height) < EPSILON &&
      Math.abs(pageBreak.paperBeforeGap - right[index].paperBeforeGap) < EPSILON,
  );
}

function selectTextblock(view, pos, event) {
  const $pos = view.state.doc.resolve(
    Math.max(0, Math.min(pos, view.state.doc.content.size)),
  );
  let depth = $pos.depth;

  while (depth > 0 && !$pos.node(depth).isTextblock) depth -= 1;
  if (depth === 0) return false;

  event.preventDefault();
  view.dispatch(
    view.state.tr.setSelection(
      TextSelection.create(
        view.state.doc,
        $pos.start(depth),
        $pos.end(depth),
      ),
    ),
  );
  return true;
}

function deleteBeforeVisualPage(view, event) {
  if (
    event.key !== "Backspace" ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !view.state.selection.empty
  ) {
    return false;
  }

  const paginationState = PAGINATION_PLUGIN_KEY.getState(view.state);
  const { $from } = view.state.selection;
  const isVisualPageStart = paginationState?.breaks.some(
    (pageBreak) => pageBreak.pos === $from.pos,
  );
  if (!isVisualPageStart || !$from.parent.isTextblock || !$from.parentOffset) {
    return false;
  }

  const precedingText = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 2),
    $from.parentOffset,
    "",
    "",
  );
  const finalCharacter = Array.from(precedingText).at(-1);
  if (!finalCharacter) return false;

  const from = $from.pos - finalCharacter.length;
  event.preventDefault();
  view.dispatch(view.state.tr.delete(from, $from.pos).scrollIntoView());
  return true;
}

class PaginationView {
  constructor(view, options) {
    this.view = view;
    this.options = options;
    this.frame = null;
    this.destroyed = false;
    this.lastPageCount = null;
    this.schedule = this.schedule.bind(this);
    this.resizeObserver = null;

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.schedule);
      this.resizeObserver.observe(view.dom);
    }

    view.dom.ownerDocument.fonts?.ready?.then(this.schedule).catch(() => {});
    this.schedule();
  }

  update(view, previousState) {
    this.view = view;
    if (!view.state.doc.eq(previousState.doc)) this.schedule();
  }

  schedule() {
    if (this.destroyed || this.frame !== null) return;
    const win = this.view.dom.ownerDocument.defaultView;
    this.frame = win.requestAnimationFrame(() => {
      this.frame = null;
      this.run();
    });
  }

  updatePagePresentation(pageCount) {
    const minimumHeight =
      pageCount * this.options.pageHeight +
      Math.max(0, pageCount - 1) * this.options.pageGap;
    this.view.dom.style.setProperty(
      "--pagination-min-height",
      `${minimumHeight}px`,
    );
    this.view.dom.setAttribute("data-page-count", String(pageCount));

    if (pageCount === this.lastPageCount) return;
    this.lastPageCount = pageCount;
    this.options.onPageCount?.(pageCount);
  }

  run() {
    if (this.destroyed) return;
    if (this.view.composing) {
      this.schedule();
      return;
    }

    const breaks = measureBreaks(this.view, this.options);
    const current = PAGINATION_PLUGIN_KEY.getState(this.view.state);
    this.updatePagePresentation(breaks.length + 1);

    if (equivalentBreaks(current?.breaks || [], breaks)) return;

    const transaction = this.view.state.tr
      .setMeta(PAGINATION_META, breaks)
      .setMeta("addToHistory", false)
      .setMeta("preventUpdate", true);
    this.view.dispatch(transaction);
  }

  destroy() {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    if (this.frame !== null) {
      this.view.dom.ownerDocument.defaultView.cancelAnimationFrame(this.frame);
    }
  }
}

/**
 * Convert HTML saved by the previous page-node implementation back into a
 * normal Tiptap document. Continuation fragments with the same pagination id
 * are joined before their legacy attributes and page wrappers are removed.
 */
export function normalizePaginationHTML(content) {
  const source = content || "<p></p>";
  if (!source.includes('data-page="true"')) return source;
  if (typeof globalThis.document === "undefined") return source;

  const template = globalThis.document.createElement("template");
  template.innerHTML = source;
  const pages = Array.from(
    template.content.querySelectorAll('[data-page="true"]'),
  );
  if (!pages.length) return source;

  const container = globalThis.document.createElement("div");
  let previousElement = null;
  let previousId = null;

  for (const page of pages) {
    for (const child of Array.from(page.children)) {
      const clone = child.cloneNode(true);
      const id = clone.getAttribute("data-pagination-id");
      const continuesPrevious =
        clone.getAttribute("data-continuation") === "true";

      if (
        continuesPrevious &&
        id &&
        id === previousId &&
        previousElement?.tagName === clone.tagName
      ) {
        while (clone.firstChild) previousElement.appendChild(clone.firstChild);
      } else {
        container.appendChild(clone);
        previousElement = clone;
        previousId = id;
      }
    }
  }

  for (const element of container.querySelectorAll(
    "[data-pagination-id], [data-continuation]",
  )) {
    element.removeAttribute("data-pagination-id");
    element.removeAttribute("data-continuation");
  }

  return container.innerHTML || "<p></p>";
}

export const Pagination = Extension.create({
  name: "pagination",
  priority: 1_000,

  addOptions() {
    return {
      onPageCount: null,
      pageHeight: 1_056,
      pageGap: 24,
      pagePaddingTop: 72,
      pagePaddingBottom: 72,
      shortParagraphMaxLines: 3,
      minLinesBeforeSplit: 2,
      maxPages: 500,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: PAGINATION_PLUGIN_KEY,

        state: {
          init: (_, state) => buildDecorationState(state.doc, [], options),
          apply(transaction, paginationState) {
            const breaks = transaction.getMeta(PAGINATION_META);
            if (breaks) {
              return buildDecorationState(transaction.doc, breaks, options);
            }
            if (transaction.docChanged) {
              return mappedDecorationState(transaction, paginationState, options);
            }
            return paginationState;
          },
        },

        props: {
          decorations(state) {
            return PAGINATION_PLUGIN_KEY.getState(state)?.decorations;
          },
          handleTripleClick(view, pos, event) {
            return selectTextblock(view, pos, event);
          },
          handleKeyDown(view, event) {
            return deleteBeforeVisualPage(view, event);
          },
        },

        view: (view) => new PaginationView(view, options),
      }),
    ];
  },
});
