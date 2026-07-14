const ICON_SVG_PATHS = {
  chevronRight: "M10,17L15,12L10,7V17Z",
  chevronDown: "M7,10L12,15L17,10H7Z",
  filterVariant: "M3,5H21L14,12V19L10,16V12L3,5Z",
  arrowUp: "M4,12L5.41,13.41L11,7.83V20H13V7.83L18.59,13.42L20,12L12,4L4,12Z",
  arrowDown:
    "M20,12L18.59,10.59L13,16.17V4H11V16.17L5.41,10.58L4,12L12,20L20,12Z",
  dotsVertical:
    "M12,8A2,2 0 1,0 12,4A2,2 0 0,0 12,8M12,10A2,2 0 1,0 12,14A2,2 0 0,0 12,10M12,16A2,2 0 1,0 12,20A2,2 0 0,0 12,16Z",
  dragVertical:
    "M7,5A2,2 0 1,1 5,7A2,2 0 0,1 7,5M7,10A2,2 0 1,1 5,12A2,2 0 0,1 7,10M7,15A2,2 0 1,1 5,17A2,2 0 0,1 7,15M17,5A2,2 0 1,1 15,7A2,2 0 0,1 17,5M17,10A2,2 0 1,1 15,12A2,2 0 0,1 17,10M17,15A2,2 0 1,1 15,17A2,2 0 0,1 17,15Z",
  viewDashboard:
    "M3,13H11V3H3V13M3,21H11V15H3V21M13,21H21V11H13V21M13,3V9H21V3H13Z",
  fileTree:
    "M3,3H9V7H3V3M4,4V6H8V4H4M3,17H9V21H3V17M4,18V20H8V18H4M3,10H9V14H3V10M4,11V13H8V11H4M11,5H15V11H21V19H15V13H11V12H15V6H11V5Z",
  lightningBolt: "M7,2V13H10V22L17,10H13L17,2H7Z",
  layers:
    "M12,2L2,7L12,12L22,7L12,2M2,17L12,22L22,17V14L12,19L2,14V17M2,12L12,17L22,12V9L12,14L2,9V12Z",
  lightbulb:
    "M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A2,2 0 0,0 10,19H14A2,2 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",
};

export function createSvgIcon(type, size = 14, className = "ck-zenith-grid-icon") {
  const pathData = ICON_SVG_PATHS[type];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", className);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", pathData ?? "");
  svg.appendChild(path);

  return svg;
}
