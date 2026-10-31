// generated from src/ — run `npm run build` after editing
window.__ModuleLoader__.load({
  id: "@addozhang/dsh-turn-toc",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/TurnTocTrigger.tsx
var import_react = require("react");
var import_react_dom = require("react-dom");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/outline.ts
var EMPTY = [];
function fenceOf(line) {
  const match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
  const run = match?.[1];
  if (run === void 0) return null;
  return { char: run[0], length: run.length };
}
function foldWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}
var NAMED_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'"
};
function plainText(content) {
  let text = content.replace(/`+([^`]|[^`][\s\S]*?[^`])`+/g, "$1").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/<((?:https?|mailto):[^>]+)>/g, "$1").replace(/~~([^~]+)~~/g, "$1").replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2").replace(/(\*|_)(?=\S)([\s\S]*?\S)\1/g, "$2").replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, "$1");
  for (const [entity, value] of Object.entries(NAMED_ENTITIES)) text = text.replaceAll(entity, value);
  text = text.replace(/&#(\d+);/g, (match, code) => decodeCodePoint(match, Number(code)));
  text = text.replace(/&#[xX]([0-9a-fA-F]+);/g, (match, code) => decodeCodePoint(match, Number.parseInt(code, 16)));
  return foldWhitespace(text);
}
function decodeCodePoint(match, code) {
  return Number.isSafeInteger(code) && code > 0 && code <= 1114111 ? String.fromCodePoint(code) : match;
}
function atxHeading(line) {
  const match = /^( {0,3})(#{1,6})(?:[ \t]+(.*))?$/.exec(line);
  if (match === null) return null;
  let content = match[3] ?? "";
  content = content.replace(/[ \t]+#+[ \t]*$/, "");
  if (/^#+$/.test(content.trim())) return null;
  const text = plainText(content);
  if (text === "") return null;
  return { depth: match[2].length, text };
}
function collectHeadings(text, emit) {
  let fence = null;
  for (const line of text.split("\n")) {
    const marker = fenceOf(line);
    if (marker !== null) {
      const after = line.slice(line.length - line.trimStart().length + marker.length).trim();
      if (fence === null) fence = marker;
      else if (marker.char === fence.char && marker.length >= fence.length && after === "") fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = atxHeading(line);
    if (heading !== null) emit(heading.depth, heading.text);
  }
}
function turnOutline(steps) {
  const occurrences = /* @__PURE__ */ new Map();
  const entries = [];
  for (const step of steps) {
    for (const block of step.blocks) {
      if (block.kind !== "text") continue;
      collectHeadings(block.text ?? "", (depth, text) => {
        const key = `${depth}:${text}`;
        const occurrence = occurrences.get(key) ?? 0;
        occurrences.set(key, occurrence + 1);
        entries.push({ depth, text, occurrence });
      });
    }
  }
  return entries.length === 0 ? EMPTY : entries;
}

// src/client/heading-dom.ts
var READING_LINE_RATIO = 0.28;
function resolveReadingLineY(root) {
  const region = root.querySelector("[data-conversation-content]");
  if (region !== null) {
    const rect = region.getBoundingClientRect();
    if (rect.height > 0) {
      const composer = root.querySelector("[data-composer-seat]");
      const composerHeight = composer?.offsetHeight ?? 152;
      const bandHeight = Math.max(200, rect.height - composerHeight);
      return Math.round(rect.top + bandHeight * READING_LINE_RATIO);
    }
  }
  const viewHeight = typeof window !== "undefined" && window.innerHeight > 0 ? window.innerHeight : 800;
  return Math.round(viewHeight * READING_LINE_RATIO);
}
function visibleTurnRows(root, turn) {
  const rows = [];
  for (const row of root.querySelectorAll(`[data-chat-turn="${turn}"]`)) {
    if (row.closest("[hidden]") === null) rows.push(row);
  }
  return rows;
}
function collectTurnHeadings(root, turn) {
  const headings = [];
  for (const row of visibleTurnRows(root, turn)) {
    for (const heading of row.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
      if (heading.closest("[hidden]") !== null) continue;
      if (heading.closest('[data-variant="think"]') !== null) continue;
      headings.push({
        depth: Number(heading.tagName.slice(1)),
        text: foldWhitespace(heading.textContent ?? ""),
        element: heading
      });
    }
  }
  return headings;
}
function matchHeadings(headings, entries) {
  const matched = [];
  let cursor = 0;
  for (const entry of entries) {
    let found = null;
    for (let index = cursor; index < headings.length; index++) {
      const heading = headings[index];
      if (heading.depth !== entry.depth || heading.text !== entry.text) continue;
      found = heading.element;
      cursor = index + 1;
      break;
    }
    matched.push(found);
  }
  return matched;
}
function findHeadingElement(root, turn, entry) {
  const headings = collectTurnHeadings(root, turn);
  let seen = 0;
  for (const heading of headings) {
    if (heading.depth !== entry.depth || heading.text !== entry.text) continue;
    if (seen === entry.occurrence) return heading.element;
    seen += 1;
  }
  return null;
}
function activeHeadingIndex(root, turn, entries, readingLineY = resolveReadingLineY(root)) {
  if (entries.length === 0) return -1;
  const tolerancePx = 6;
  const matched = matchHeadings(collectTurnHeadings(root, turn), entries);
  let active = 0;
  for (let index = 0; index < matched.length; index++) {
    const element = matched[index];
    if (element === null) continue;
    const rect = element.getBoundingClientRect();
    if (rect.top <= readingLineY + tolerancePx) active = index;
    else break;
  }
  return active;
}
function revealEntry(root, turn, entry) {
  const smooth = !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const readingLineY = resolveReadingLineY(root);
  const heading = findHeadingElement(root, turn, entry);
  if (heading !== null) {
    scrollToTarget(heading, readingLineY, smooth);
    flashTarget(heading);
    return "heading";
  }
  const row = visibleTurnRows(root, turn)[0];
  if (row === void 0) return "none";
  scrollToTarget(row, readingLineY, smooth);
  return "turn";
}
function revealTurnStart(root, turn) {
  const row = visibleTurnRows(root, turn)[0];
  if (row === void 0) return false;
  const smooth = !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const readingLineY = resolveReadingLineY(root);
  scrollToTarget(row, readingLineY, smooth);
  return true;
}
function findScrollContainer(element) {
  let current = element.parentElement;
  while (current !== null) {
    if (current.scrollHeight > current.clientHeight + 4) {
      const overflowY = typeof getComputedStyle === "function" ? getComputedStyle(current).overflowY : "auto";
      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") return current;
    }
    current = current.parentElement;
  }
  return null;
}
function scrollToTarget(element, readingLineY, smooth) {
  const scroller = findScrollContainer(element);
  if (scroller !== null && typeof scroller.scrollTo === "function") {
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    if (scrollerRect.height > 0) {
      const offsetInScroller = Math.max(24, readingLineY - scrollerRect.top);
      const nextTop = Math.max(0, scroller.scrollTop + (targetRect.top - scrollerRect.top) - offsetInScroller);
      scroller.scrollTo({ top: nextTop, behavior: smooth ? "smooth" : "auto" });
      return;
    }
  }
  if (typeof element.scrollIntoView !== "function") return;
  element.scrollIntoView(smooth ? { behavior: "smooth", block: "center" } : { behavior: "auto", block: "center" });
}
function flashTarget(element) {
  if (typeof element.setAttribute !== "function") return;
  element.setAttribute("data-dsh-toc-flash", "");
  setTimeout(() => {
    element.removeAttribute("data-dsh-toc-flash");
  }, 1100);
}

// src/client/TurnTocTrigger.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var EMPTY_ENTRIES = [];
var EMPTY_STEPS = [];
var EMPTY_TURNS = [];
var COLUMN_GAP_PX = 16;
var OUTER_NAV_CLEARANCE_PX = 52;
var MIN_CONTAINER_WIDTH_PX = 1280;
var MAX_CARD_WIDTH_PX = 244;
var MIN_CARD_WIDTH_PX = 176;
function visibleRows(entries, collapsed, activeIndex) {
  const rows = [];
  let hiddenUnder = null;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (hiddenUnder !== null) {
      if (entry.depth > hiddenUnder) {
        if (index === activeIndex && rows.length > 0) {
          const parent = rows[rows.length - 1];
          rows[rows.length - 1] = { ...parent, active: true };
        }
        continue;
      }
      hiddenUnder = null;
    }
    const hasChildren = index + 1 < entries.length && entries[index + 1].depth > entry.depth;
    rows.push({ entry, index, hasChildren, active: index === activeIndex });
    if (hasChildren && collapsed.has(index)) hiddenUnder = entry.depth;
  }
  return rows;
}
function turnAtReadingLine() {
  const line = resolveReadingLineY(document);
  let current = null;
  let fallback = null;
  for (const row of document.querySelectorAll("[data-chat-turn]")) {
    if (row.closest("[hidden]") !== null) continue;
    const rect = row.getBoundingClientRect();
    if (rect.bottom <= 0) continue;
    if (rect.top >= window.innerHeight) break;
    const turn = Number(row.dataset.chatTurn);
    if (!Number.isInteger(turn) || turn < 0) continue;
    fallback ??= turn;
    if (rect.top <= line + 6) current = turn;
  }
  return current ?? fallback;
}
function measureRightMargin() {
  const region = document.querySelector("[data-conversation-content]");
  const column = document.querySelector("[data-chat-flow]");
  if (region === null || column === null) return null;
  const regionRect = region.getBoundingClientRect();
  const columnRect = column.getBoundingClientRect();
  if (regionRect.width <= 0 || columnRect.width <= 0) return null;
  const composer = document.querySelector("[data-composer-seat]");
  const composerHeight = composer?.offsetHeight ?? 152;
  const readingBandHeight = Math.max(200, regionRect.height - composerHeight);
  const centerY = Math.round(regionRect.top + readingBandHeight / 2);
  const railLeft = Math.round(columnRect.right + COLUMN_GAP_PX);
  const usableRight = Math.round(regionRect.right - OUTER_NAV_CLEARANCE_PX);
  const gutterWidth = usableRight - railLeft;
  const visible = regionRect.width >= MIN_CONTAINER_WIDTH_PX && gutterWidth >= MIN_CARD_WIDTH_PX;
  const cardWidth = Math.min(MAX_CARD_WIDTH_PX, Math.max(MIN_CARD_WIDTH_PX, gutterWidth));
  const cardLeft = railLeft;
  return { centerY, railLeft, cardLeft, cardWidth, visible };
}
function sameGeometry(left, right) {
  if (left === right) return true;
  if (left === null || right === null) return false;
  return left.centerY === right.centerY && left.railLeft === right.railLeft && left.cardLeft === right.cardLeft && left.cardWidth === right.cardWidth && left.visible === right.visible;
}
function TurnTocTrigger({ useChat, t }) {
  const [activeTurn, setActiveTurn] = (0, import_react.useState)(null);
  const [activeIdx, setActiveIdx] = (0, import_react.useState)(0);
  const [pinned, setPinned] = (0, import_react.useState)(false);
  const [hoverOpen, setHoverOpen] = (0, import_react.useState)(false);
  const [collapsed, setCollapsed] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
  const [geometry, setGeometry] = (0, import_react.useState)(null);
  const rootRef = (0, import_react.useRef)(null);
  const hoverTimerRef = (0, import_react.useRef)(null);
  const jumpHoldRef = (0, import_react.useRef)(0);
  const model = useChat((snapshot) => {
    const order = snapshot.order;
    const loadedTurns = snapshot.navigation.items().map((item) => item.turn);
    const fallbackTurn = loadedTurns.at(-1) ?? null;
    const targetTurn = activeTurn ?? fallbackTurn;
    const steps = targetTurn === null ? EMPTY_STEPS : snapshot.nodes.turnDataSource(targetTurn, "assistant-step").getSnapshot();
    return {
      order,
      turn: targetTurn,
      turns: loadedTurns.length > 0 ? loadedTurns : EMPTY_TURNS,
      steps
    };
  });
  const entries = (0, import_react.useMemo)(
    () => model === null || model.turn === null ? EMPTY_ENTRIES : turnOutline(model.steps),
    [model]
  );
  const turn = model?.turn ?? null;
  const turns = model?.turns ?? EMPTY_TURNS;
  const minDepth = (0, import_react.useMemo)(
    () => entries.length === 0 ? 1 : entries.reduce((min, item) => Math.min(min, item.depth), 6),
    [entries]
  );
  const latestRef = (0, import_react.useRef)({ turn, entries });
  latestRef.current = { turn, entries };
  const scheduleRef = (0, import_react.useRef)(null);
  (0, import_react.useLayoutEffect)(() => {
    let frame = null;
    const compute = () => {
      frame = null;
      if (typeof performance !== "undefined" && performance.now() < jumpHoldRef.current) return;
      const nextTurn2 = turnAtReadingLine();
      if (nextTurn2 !== null) {
        setActiveTurn((previous) => previous === nextTurn2 ? previous : nextTurn2);
      }
      const nextGeo = measureRightMargin();
      setGeometry((previous) => sameGeometry(previous, nextGeo) ? previous : nextGeo);
      const effectiveTurn = nextTurn2 ?? latestRef.current.turn;
      if (effectiveTurn !== null && latestRef.current.entries.length > 0) {
        const nextIdx = activeHeadingIndex(document, effectiveTurn, latestRef.current.entries);
        setActiveIdx((previous) => previous === nextIdx ? previous : nextIdx);
      }
    };
    const schedule = () => {
      if (frame !== null) return;
      if (typeof requestAnimationFrame === "function") frame = requestAnimationFrame(compute);
      else compute();
    };
    const onScrollEnd = () => {
      jumpHoldRef.current = 0;
    };
    const onScroll = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-conversation-content]") === null) return;
      schedule();
    };
    scheduleRef.current = schedule;
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    if ("onscrollend" in document) {
      document.addEventListener("scrollend", onScrollEnd, { capture: true });
    }
    window.addEventListener("resize", schedule);
    const region = document.querySelector("[data-conversation-content]");
    const observer = typeof ResizeObserver === "function" && region !== null ? new ResizeObserver(schedule) : null;
    if (observer !== null && region !== null) observer.observe(region);
    schedule();
    return () => {
      scheduleRef.current = null;
      if (frame !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
      document.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("scrollend", onScrollEnd, { capture: true });
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, []);
  const structureKey = model?.order;
  (0, import_react.useLayoutEffect)(() => {
    scheduleRef.current?.();
  }, [structureKey, entries]);
  (0, import_react.useLayoutEffect)(() => {
    setCollapsed(/* @__PURE__ */ new Set());
    setActiveIdx(0);
  }, [turn]);
  const rows = (0, import_react.useMemo)(
    () => visibleRows(entries, collapsed, activeIdx),
    [entries, collapsed, activeIdx]
  );
  if (turn === null || entries.length === 0 || geometry === null || !geometry.visible) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: rootRef });
  }
  const turnIndex = turns.indexOf(turn);
  const prevTurn = turnIndex > 0 ? turns[turnIndex - 1] : null;
  const nextTurn = turnIndex >= 0 && turnIndex + 1 < turns.length ? turns[turnIndex + 1] : null;
  const isExpanded = pinned || hoverOpen;
  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };
  const onPointerEnter = () => {
    clearHoverTimer();
    setHoverOpen(true);
  };
  const onPointerLeave = () => {
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      setHoverOpen(false);
    }, 160);
  };
  const toggleSubtree = (index) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const startJump = () => {
    jumpHoldRef.current = (typeof performance !== "undefined" ? performance.now() : Date.now()) + 900;
  };
  const jumpToTurn = (targetTurn) => {
    startJump();
    setActiveTurn(targetTurn);
    revealTurnStart(document, targetTurn);
  };
  const railStyle = {
    top: geometry.centerY,
    left: geometry.railLeft
  };
  const panelStyle = {
    top: geometry.centerY,
    left: geometry.cardLeft,
    width: geometry.cardWidth
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: rootRef, children: (0, import_react_dom.createPortal)(
    isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      import_dsh_client_ui_primitives.MenuSurface,
      {
        className: "dsh-toc-panel",
        "data-pinned": pinned ? "true" : void 0,
        style: panelStyle,
        onPointerEnter,
        onPointerLeave,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-toc-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                className: "dsh-toc-turnBtn",
                title: t("toc.turnTop", { turn }),
                "aria-label": t("toc.turnTop", { turn }),
                onClick: () => {
                  startJump();
                  revealTurnStart(document, turn);
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-toc-turnLabel", children: t("toc.turn", { turn }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-toc-count", children: t("toc.count", { count: entries.length }) })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-toc-navGroup", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsh-toc-iconBtn",
                  disabled: prevTurn === null,
                  title: prevTurn === null ? void 0 : t("toc.prevTurn", { turn: prevTurn }),
                  "aria-label": t("toc.prevTurn", { turn: prevTurn ?? turn }),
                  onClick: () => {
                    if (prevTurn !== null) jumpToTurn(prevTurn);
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronUpOutlineRegular, { size: 12 })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsh-toc-iconBtn",
                  disabled: nextTurn === null,
                  title: nextTurn === null ? void 0 : t("toc.nextTurn", { turn: nextTurn }),
                  "aria-label": t("toc.nextTurn", { turn: nextTurn ?? turn }),
                  onClick: () => {
                    if (nextTurn !== null) jumpToTurn(nextTurn);
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "dsh-toc-iconBtn",
                  "aria-pressed": pinned,
                  title: t(pinned ? "toc.unpin" : "toc.pin"),
                  "aria-label": t(pinned ? "toc.unpin" : "toc.pin"),
                  onClick: () => {
                    setPinned((current) => !current);
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "path",
                    {
                      d: "M9.8 2.2L13.8 6.2L12.4 7.6L10.3 6.9L7.4 9.8L8.1 11.9L6.7 13.3L4.2 10.8L1.9 13.1L1.2 12.4L3.5 10.1L1 7.6L2.4 6.2L4.5 6.9L7.4 4L6.7 1.9L8.1 0.5L9.8 2.2Z",
                      fill: "currentColor"
                    }
                  ) })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { className: "dsh-toc-list", "aria-label": t("toc.panelLabel"), children: rows.map(({ entry, index, hasChildren, active }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: "dsh-toc-row",
              "data-active": active ? "true" : void 0,
              style: { paddingInlineStart: Math.max(0, entry.depth - minDepth) * 10 + 4 },
              children: [
                hasChildren ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "dsh-toc-chevron",
                    "aria-expanded": !collapsed.has(index),
                    "aria-label": t(collapsed.has(index) ? "toc.expand" : "toc.collapse", { title: entry.text }),
                    tabIndex: -1,
                    onClick: () => {
                      toggleSubtree(index);
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 10, className: collapsed.has(index) ? void 0 : "dsh-toc-chevronOpen" })
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-toc-spacer", "aria-hidden": "true" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "dsh-toc-link",
                    title: entry.text,
                    "aria-label": t("toc.jump", { title: entry.text }),
                    "aria-current": active ? "location" : void 0,
                    onClick: () => {
                      startJump();
                      setActiveIdx(index);
                      revealEntry(document, turn, entry);
                    },
                    children: entry.text
                  }
                )
              ]
            },
            index
          )) })
        ]
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "nav",
      {
        className: "dsh-toc-rail",
        style: railStyle,
        "aria-label": t("toc.panelLabel"),
        onPointerEnter,
        onPointerLeave,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-toc-railTurn", children: [
            "T",
            turn
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-toc-railMarks", children: entries.map((entry, index) => {
            const markWidth = Math.max(8, 20 - Math.max(0, entry.depth - minDepth) * 5);
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "dsh-toc-mark",
                "data-active": index === activeIdx ? "true" : void 0,
                title: entry.text,
                "aria-label": t("toc.jump", { title: entry.text }),
                style: { "--dsh-toc-mark-width": `${markWidth}px` },
                onClick: () => {
                  startJump();
                  setActiveIdx(index);
                  revealEntry(document, turn, entry);
                }
              },
              index
            );
          }) })
        ]
      }
    ),
    document.body
  ) });
}

// src/client/locale.ts
var NS = "turn-toc";
var zh = {
  "toc.panelLabel": "\u672C\u8F6E\u76EE\u5F55",
  "toc.turn": "\u7B2C {turn} \u8F6E",
  "toc.count": "{count} \u8282",
  "toc.jump": "\u8DF3\u8F6C\u5230\u300C{title}\u300D",
  "toc.collapse": "\u6536\u8D77\u300C{title}\u300D\u7684\u5B50\u6807\u9898",
  "toc.expand": "\u5C55\u5F00\u300C{title}\u300D\u7684\u5B50\u6807\u9898",
  "toc.pin": "\u56FA\u5B9A\u5C55\u5F00\u76EE\u5F55",
  "toc.unpin": "\u53D6\u6D88\u56FA\u5B9A\uFF08\u79FB\u51FA\u81EA\u52A8\u6536\u8D77\u4E3A\u523B\u5EA6\uFF09",
  "toc.prevTurn": "\u4E0A\u4E00\u8F6E\uFF08\u7B2C {turn} \u8F6E\uFF09",
  "toc.nextTurn": "\u4E0B\u4E00\u8F6E\uFF08\u7B2C {turn} \u8F6E\uFF09",
  "toc.turnTop": "\u56DE\u5230\u7B2C {turn} \u8F6E\u5F00\u5934"
};
var en = {
  "toc.panelLabel": "Turn outline",
  "toc.turn": "Turn {turn}",
  "toc.count": "{count} sections",
  "toc.jump": 'Jump to "{title}"',
  "toc.collapse": 'Collapse subsections of "{title}"',
  "toc.expand": 'Expand subsections of "{title}"',
  "toc.pin": "Pin outline open",
  "toc.unpin": "Unpin outline (auto-collapse to ticks)",
  "toc.prevTurn": "Previous turn (Turn {turn})",
  "toc.nextTurn": "Next turn (Turn {turn})",
  "toc.turnTop": "Scroll to start of Turn {turn}"
};

// src/client/styles.ts
var STYLESHEET = `
/* Frameless section-tick rail seated just outside the right edge of the
   centered message column, vertically centered in the reading band. */
.dsh-toc-rail {
  position: fixed;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 28px;
  max-height: 360px;
  padding: 6px 4px;
  border: 0;
  background: transparent;
  transform: translateY(-50%);
}

.dsh-toc-railTurn {
  margin-bottom: 4px;
  padding: 0 2px;
  font-size: 10px;
  line-height: 12px;
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.75;
  user-select: none;
  transition: opacity 140ms ease, color 140ms ease;
}

.dsh-toc-rail:hover .dsh-toc-railTurn {
  opacity: 1;
  color: var(--dsw-alias-label-secondary);
}

.dsh-toc-railMarks {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.dsh-toc-railMarks::-webkit-scrollbar {
  display: none;
}

/* Each mark is a 10px-tall hit target drawing a 2px rounded bar, matching
   TurnNavigator.module.css (.mark / .mark::before). */
.dsh-toc-mark {
  position: relative;
  display: block;
  width: 24px;
  height: 10px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.dsh-toc-mark::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--dsh-toc-mark-width, 18px);
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-border-l4);
  content: '';
  transform: translateY(-50%) scaleX(0.72);
  transform-origin: left center;
  transition: transform 140ms ease, background-color 140ms ease;
}

.dsh-toc-mark:hover::before,
.dsh-toc-mark:focus-visible::before {
  transform: translateY(-50%) scaleX(0.95);
  background: var(--dsw-alias-label-tertiary);
}

.dsh-toc-mark[data-active='true']::before {
  transform: translateY(-50%) scaleX(1);
  background: var(--dsw-alias-label-primary);
}

/* Interactive outline card anchored on the right of the message column,
   sharing TurnNavigator.preview's elevation and radius tokens. */
.dsh-toc-panel {
  position: fixed;
  z-index: 80;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: min(420px, calc(100vh - 180px));
  overflow: hidden;
  border-radius: var(--dsw-radius-lg);
  transform: translateY(-50%);
  animation: dsh-toc-panel-enter 120ms ease-out;
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
}

.dsh-toc-panel[data-pinned='true'] {
  z-index: 6;
  box-shadow: var(--dsw-elevation-soft, 0 4px 16px rgba(0, 0, 0, 0.08));
}

@keyframes dsh-toc-panel-enter {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}

.dsh-toc-head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 6px 6px 10px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l3);
}

.dsh-toc-turnBtn {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 2px 4px;
  border: none;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.dsh-toc-turnBtn:hover,
.dsh-toc-turnBtn:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-toc-turnLabel {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-toc-count {
  flex: none;
  font-size: 11px;
  line-height: 16px;
  font-weight: 400;
  color: var(--dsw-alias-label-tertiary);
}

.dsh-toc-navGroup {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  flex: none;
}

.dsh-toc-iconBtn {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}

.dsh-toc-iconBtn:hover:not(:disabled),
.dsh-toc-iconBtn:focus-visible:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dsh-toc-iconBtn[aria-pressed='true'] {
  color: var(--dsw-alias-state-business-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-toc-iconBtn:disabled {
  opacity: 0.32;
  cursor: default;
}

.dsh-toc-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px 4px 8px 6px;
}

.dsh-toc-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  border-radius: var(--dsw-radius-xs);
}

.dsh-toc-row::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 140ms ease;
}

.dsh-toc-row[data-active='true']::before {
  background: var(--dsw-alias-state-business-primary);
}

.dsh-toc-row[data-active='true'] {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-toc-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-toc-spacer {
  flex: none;
  width: 14px;
}

.dsh-toc-chevron {
  display: grid;
  place-items: center;
  flex: none;
  width: 14px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}

.dsh-toc-chevron:hover {
  color: var(--dsw-alias-label-primary);
}

.dsh-toc-chevron svg {
  transition: transform 120ms ease;
}

/* Expanded subtrees point the chevron down; collapsed ones point right. */
.dsh-toc-chevron svg.dsh-toc-chevronOpen {
  transform: none;
}

.dsh-toc-chevron svg:not(.dsh-toc-chevronOpen) {
  transform: rotate(-90deg);
}

.dsh-toc-link {
  flex: 1 1 auto;
  min-width: 0;
  padding: 3px 6px 3px 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.dsh-toc-row[data-active='true'] .dsh-toc-link {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.dsh-toc-link:hover,
.dsh-toc-link:focus-visible {
  color: var(--dsw-alias-label-primary);
}

/* Brief target highlight when jumping to a heading in the transcript. */
[data-dsh-toc-flash] {
  border-radius: 4px;
  background: var(--dsw-alias-interactive-bg-hover);
  transition: background-color 400ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .dsh-toc-mark::before,
  .dsh-toc-panel {
    transition: none;
    animation: none;
  }
}
`;

// src/client/index.ts
var inject = ["slots", "locale"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "turn-toc: dictionaries");
  ctx.effect(() => {
    const sheet = document.createElement("style");
    sheet.dataset.dshTurnToc = "";
    sheet.textContent = STYLESHEET;
    document.head.append(sheet);
    return () => {
      sheet.remove();
    };
  }, "turn-toc: styles");
  ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
    name: "conversation.input.right",
    id: "turn-toc",
    order: 100,
    locale: NS
  }, TurnTocTrigger));
}
    return module.exports;
  },
});
