// Small inline SVG icon set (no icon library needed)
const paths = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.2-4.2",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zm4 10a2 2 0 0 0 4 0",
  mail: "M3 6h18v12H3zM3 7l9 7 9-7",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  logout: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
  heart: "M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 3.4 4 6.7 4c2 0 3.5 1.1 5.3 3 1.8-1.9 3.3-3 5.3-3 3.3 0 5.3 3.4 4 6.8C19.5 15.4 12 20 12 20z",
  comment: "M4 5h16v11H9l-5 4z",
  share: "M12 3v12M7 8l5-5 5 5M5 14v6h14v-6",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  send: "M4 12 20 4l-4 16-4-6z",
  back: "M15 5l-7 7 7 7",
};

export default function Icon({ name, size = 20, filled = false, strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
