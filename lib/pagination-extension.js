import { Extension,Node } from "@tiptap/core";
import { Plugin,PluginKey,TextSelection } from "@tiptap/pm/state";

export const PagedDocument=Node.create({name:"doc",topNode:true,content:"page+"});

export const Page=Node.create({
  name:"page",
  group:"block",
  content:"block+",
  defining:true,
  parseHTML(){return[{tag:'div[data-page="true"]'}]},
  renderHTML({HTMLAttributes}){return["div",{...HTMLAttributes,"data-page":"true",class:"page-node"},0]}
});

const paginationKey=new PluginKey("flowPagination");
function pagePositions(doc){const result=[];let pos=0;doc.forEach(node=>{result.push({node,pos});pos+=node.nodeSize});return result}
function lastVisibleTextPosition(view,element,pageBottom,fallback){let best=fallback;const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let textNode;while((textNode=walker.nextNode())){if(!textNode.nodeValue?.length)continue;const range=document.createRange();range.setStart(textNode,0);range.setEnd(textNode,textNode.nodeValue.length);const rects=[...range.getClientRects()];if(rects.length&&rects.at(-1).bottom<=pageBottom+1){best=view.posAtDOM(textNode,textNode.nodeValue.length);continue}let low=1,high=textNode.nodeValue.length;while(low<=high){const middle=Math.floor((low+high)/2);range.setEnd(textNode,middle);const partial=[...range.getClientRects()];const bottom=partial.length?partial.at(-1).bottom:Number.POSITIVE_INFINITY;if(bottom<=pageBottom+1){best=view.posAtDOM(textNode,middle);low=middle+1}else high=middle-1}break}return best}

export const Pagination=Extension.create({
  name:"pagination",
  addOptions(){return{onPageCount:()=>{}}},
  addGlobalAttributes(){return[{types:["paragraph"],attributes:{paragraphId:{default:null,parseHTML:element=>element.getAttribute("data-paragraph-id"),renderHTML:attributes=>attributes.paragraphId?{"data-paragraph-id":attributes.paragraphId}:{}},continuation:{default:false,parseHTML:element=>element.getAttribute("data-continuation")==="true",renderHTML:attributes=>attributes.continuation?{"data-continuation":"true"}:{}}}}]},
  addProseMirrorPlugins(){const pageType=this.editor.schema.nodes.page;const onPageCount=this.options.onPageCount;let frame;let balancing=false;return[new Plugin({key:paginationKey,view(){return{update(view){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(balancing)return;const pages=pagePositions(view.state.doc);onPageCount(pages.length);for(let index=0;index<pages.length;index++){const {node,pos}=pages[index];const dom=view.nodeDOM(pos);if(!(dom instanceof HTMLElement)||dom.scrollHeight<=dom.clientHeight+1)continue;const last=node.lastChild;let offset=0;for(let child=0;child<node.childCount-1;child++)offset+=node.child(child).nodeSize;const from=pos+1+offset;const to=from+last.nodeSize;const lastDom=dom.lastElementChild;const styles=getComputedStyle(dom);const usableHeight=dom.clientHeight-parseFloat(styles.paddingTop)-parseFloat(styles.paddingBottom);const oversized=lastDom instanceof HTMLElement&&lastDom.scrollHeight>usableHeight-1;

const lastStyles=lastDom instanceof HTMLElement?getComputedStyle(lastDom):null;const lineHeight=lastStyles?parseFloat(lastStyles.lineHeight)||32:32;const renderedHeight=lastDom instanceof HTMLElement?lastDom.getBoundingClientRect().height:0;const renderedLines=Math.max(1,Math.ceil(renderedHeight/lineHeight-.01));const shouldSplit=oversized||renderedLines>3||node.childCount===1;
if(shouldSplit&&last.isTextblock&&last.content.size>1&&lastDom instanceof HTMLElement){const contentStart=from+1;const contentEnd=to-1;const pageBottom=dom.getBoundingClientRect().bottom-parseFloat(styles.paddingBottom);const best=lastVisibleTextPosition(view,lastDom,pageBottom,contentStart);if(best>contentStart&&best<contentEnd){const before=last.textBetween(0,best-contentStart," "," ");const wordBreak=Math.max(before.lastIndexOf(" "),before.lastIndexOf("\n"));const splitAt=wordBreak>0?contentStart+wordBreak+1:best;if(splitAt>contentStart&&splitAt<contentEnd&&view.state.tr.doc.resolve(splitAt).parent.isTextblock){const paragraphId=last.attrs.paragraphId||crypto.randomUUID();let splitTr=view.state.tr;if(!last.attrs.paragraphId)splitTr=splitTr.setNodeMarkup(from,undefined,{...last.attrs,paragraphId});splitTr=splitTr.split(splitAt,1,[{type:last.type,attrs:{...last.attrs,paragraphId,continuation:true}}]);balancing=true;view.dispatch(splitTr);balancing=false;return}}}

if(node.childCount<2)continue;let tr=view.state.tr.delete(from,to);if(index+1<pages.length){const nextPos=tr.mapping.map(pages[index+1].pos);tr=tr.insert(nextPos+1,last)}else{const afterPage=tr.mapping.map(pos+node.nodeSize);tr=tr.insert(afterPage,pageType.create(null,last))}balancing=true;view.dispatch(tr);balancing=false;return}})},destroy(){cancelAnimationFrame(frame)}}},props:{handleDoubleClick(view,pos){const $pos=view.state.doc.resolve(pos);const paragraph=$pos.parent;if(paragraph.type.name!=="paragraph"||!paragraph.attrs.paragraphId)return false;let start=null,end=null;view.state.doc.descendants((node,nodePos)=>{if(node.type.name==="paragraph"&&node.attrs.paragraphId===paragraph.attrs.paragraphId){if(start===null)start=nodePos+1;end=nodePos+node.nodeSize-1}});if(start!==null&&end!==null){view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,start,end)));return true}return false}}})]}
});
