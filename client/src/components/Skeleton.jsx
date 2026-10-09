export function Skel({ w = "100%", h = 12, r, circle = false, style }) {
  return (
    <div
      className="skel"
      style={{ width: w, height: h, borderRadius: circle ? "50%" : r, flexShrink: circle ? 0 : undefined, ...style }}
    />
  );
}

export function ThoughtSkeletons({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <div className="thought" key={i} aria-hidden="true">
      <div className="thought-top">
        <Skel circle w={44} h={44} />
        <div className="thought-main" style={{ display: "grid", gap: 10 }}>
          <Skel w="42%" h={13} />
          <Skel w="96%" h={12} />
          <Skel w={i % 2 ? "70%" : "84%"} h={12} />
          <Skel w="30%" h={12} style={{ marginTop: 4 }} />
        </div>
      </div>
    </div>
  ));
}

export function CommentSkeletons({ count = 2 }) {
  return Array.from({ length: count }, (_, i) => (
    <div className="comment" key={i} aria-hidden="true">
      <Skel circle w={32} h={32} />
      <div style={{ flex: 1, display: "grid", gap: 8 }}>
        <Skel w="34%" h={11} />
        <Skel w={i % 2 ? "58%" : "80%"} h={11} />
      </div>
    </div>
  ));
}

export function ConvSkeletons({ count = 5 }) {
  return Array.from({ length: count }, (_, i) => (
    <div className="conv-item" key={i} aria-hidden="true" style={{ cursor: "default" }}>
      <Skel circle w={44} h={44} />
      <div style={{ flex: 1, display: "grid", gap: 8 }}>
        <Skel w="50%" h={12} />
        <Skel w="75%" h={11} />
      </div>
    </div>
  ));
}

export function ChatSkeleton() {
  const rows = [
    { mine: false, w: "46%" },
    { mine: true, w: "38%" },
    { mine: false, w: "58%" },
    { mine: true, w: "30%" },
  ];
  return (
    <>
      {rows.map((r, i) => (
        <div key={i} className={"msg-row" + (r.mine ? " mine" : "")} aria-hidden="true" style={{ width: "100%", maxWidth: "100%" }}>
          <Skel w={r.w} h={38} r={18} />
        </div>
      ))}
    </>
  );
}

export function UserRowSkeletons({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <div className="user-row" key={i} aria-hidden="true">
      <Skel circle w={40} h={40} />
      <div className="grow" style={{ display: "grid", gap: 8 }}>
        <Skel w="40%" h={12} />
        <Skel w="25%" h={11} />
      </div>
    </div>
  ));
}
