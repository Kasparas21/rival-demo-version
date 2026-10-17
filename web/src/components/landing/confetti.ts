import { prefersReducedMotion } from "./editorial-tilt";
import styles from "./confetti.module.css";

/** Confetti in Rival's colours: white, pale sky, butter, sky and steel. */
const BURST_COLORS = ["#ffffff", "#ddf1fd", "#fff4cb", "#9ad1ff", "#4a7fa5", "#e9f6b8"];

/** Confetti from a point: clicks on the trial button and other reward moments pay out. */
export function burst(x: number, y: number, colors = BURST_COLORS, count = 18) {
  if (prefersReducedMotion()) return;
  const layer = document.createElement("div");
  layer.className = styles.layer;
  document.body.appendChild(layer);
  let finished = 0;
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    particle.className = styles.particle;
    if (i % 3 === 0) particle.dataset.shape = "star";
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const distance = 46 + Math.random() * 70;
    const size = 5 + Math.random() * 7;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = colors[i % colors.length];
    layer.appendChild(particle);
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 18;
    particle.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.4) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx * 0.75}px), calc(-50% + ${dy * 0.75}px)) scale(1.15) rotate(${angle * 90}deg)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 26}px)) scale(0) rotate(${angle * 140}deg)`,
          opacity: 0,
        },
      ],
      { duration: 700 + Math.random() * 350, easing: "cubic-bezier(0.15, 0.8, 0.3, 1)" },
    ).onfinish = () => {
      finished += 1;
      if (finished === count) layer.remove();
    };
  }
}
