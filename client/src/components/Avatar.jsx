// A soft, consistent colour per person (based on their name) for users without a photo
function hueFor(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export default function Avatar({ user, size = 40 }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (user?.profilePicture) {
    return <img className="avatar" src={user.profilePicture} alt="" style={style} loading="lazy" />;
  }
  const name = (user?.fullName || user?.username || "?").trim();
  const hue = hueFor(name);
  return (
    <div
      className="avatar avatar-fallback"
      style={{ ...style, background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 40) % 360} 70% 46%))` }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
