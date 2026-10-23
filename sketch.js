// 用 p5.js 畫「考試大鐘」的大時鐘（時:分:秒 + 秒針進度條）
// 若 p5.js 載入失敗，原本的文字時鐘會繼續顯示，其他功能不受影響。
let holder;
const pad2 = n => (n < 10 ? "0" : "") + n;

function holderSize() {
  const w = holder.clientWidth;
  const h = Math.min(window.innerWidth * 0.18, window.innerHeight * 0.34) * 1.1 + 16;
  return [w, h];
}

function setup() {
  holder = document.getElementById("clockHolder");
  const [w, h] = holderSize();
  createCanvas(max(w, 10), h).parent(holder);
  document.getElementById("clock").style.display = "none";
  textAlign(CENTER, CENTER);
  textFont("monospace");   // 不要寫含空白的字型清單，p5 會因此讓字型失效
  textStyle(BOLD);
}

function windowResized() { fitCanvas(); }

function fitCanvas() {
  const [w, h] = holderSize();
  if (w > 10 && (abs(w - width) > 1 || abs(h - height) > 1)) resizeCanvas(w, h);
}

function draw() {
  if (holder.clientWidth < 10) return;   // 切到其他分頁時不用畫
  fitCanvas();
  clear();
  const d = new Date();
  const t = pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  const danger = !!(window.ExamClock && window.ExamClock.danger);
  const col = danger ? color(255, 77, 79) : color(232, 238, 245);
  const barH = 8, textH = height - barH - 8;

  drawingContext.shadowBlur = danger ? 30 : 0;
  drawingContext.shadowColor = "rgba(255,77,79,.5)";
  noStroke();
  fill(col);
  textSize(min(width / 4.95, textH / 1.05));
  text(t, width / 2, textH / 2);
  drawingContext.shadowBlur = 0;

  // 秒針進度條
  const bw = min(width * 0.8, 900), bx = (width - bw) / 2, by = height - barH;
  fill(42, 53, 68);
  rect(bx, by, bw, barH, 4);
  fill(danger ? color(255, 77, 79) : color(77, 208, 225));
  rect(bx, by, bw * ((d.getSeconds() + d.getMilliseconds() / 1000) / 60), barH, 4);
}
