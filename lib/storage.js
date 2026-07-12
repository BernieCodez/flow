"use client";
import { seedProjects } from "./demo-data";
const KEY="flow-projects-v1";
export function loadProjects(){ if(typeof window==="undefined") return seedProjects; try { return JSON.parse(localStorage.getItem(KEY)) || seedProjects; } catch { return seedProjects; } }
export function saveProjects(projects){ localStorage.setItem(KEY,JSON.stringify(projects)); }
export function randomTitle(){ const a=["Quiet","Golden","Open","Brave","Wandering","Curious"]; const n=["Horizon","Thread","Lantern","Compass","Current","Margin"]; return `${a[Math.floor(Math.random()*a.length)]} ${n[Math.floor(Math.random()*n.length)]}`; }
