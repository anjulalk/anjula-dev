+++
title = "Photography"
description = "Photographs by Anjula Karunarathne from travels in Sri Lanka and beyond, including Kuala Lumpur, Kandy and Anuradhapura."
showDate = false
showReadingTime = false
showAuthor = false
showPagination = false
# Held back until the real photographs are in place. Remove this line to publish.
draft = true
+++

<!-- Placeholder photos for layout. Replace the files under
     static/images/photos/<trip>/ with real shots (same names) to publish.
     Rows are computed at runtime by the script at the bottom from each
     photo's natural size: filled edge to edge with at most 10% crop per
     side. The static markup below is the no-JS fallback. -->

## Kuala Lumpur 2025

*Towers, street food and city lights.*

<div class="photoset">
<div class="photorow" style="height: 480px;">
  <img src="/images/photos/kl-2025/02.jpg" alt="Kuala Lumpur 2025 photo 2" loading="lazy" style="flex-grow: 1;" />
  <img src="/images/photos/kl-2025/01.jpg" alt="Kuala Lumpur 2025 photo 1" loading="lazy" style="flex-grow: 2;" />
</div>
<div class="photorow" style="height: 380px;">
  <img src="/images/photos/kl-2025/03.jpg" alt="Kuala Lumpur 2025 photo 3" loading="lazy" style="flex-grow: 1.4;" />
  <img src="/images/photos/kl-2025/04.jpg" alt="Kuala Lumpur 2025 photo 4" loading="lazy" style="flex-grow: 1;" />
</div>
</div>

## Kandy 2024

*Lake, hills and old temples.*

<div class="photoset">
<div class="photorow" style="height: 450px;">
  <img src="/images/photos/kandy-2024/01.jpg" alt="Kandy 2024 photo 1" loading="lazy" style="flex-grow: 1;" />
  <img src="/images/photos/kandy-2024/02.jpg" alt="Kandy 2024 photo 2" loading="lazy" style="flex-grow: 2;" />
</div>
<div class="photorow" style="height: 510px;">
  <img src="/images/photos/kandy-2024/04.jpg" alt="Kandy 2024 photo 4" loading="lazy" style="flex-grow: 1.5;" />
  <img src="/images/photos/kandy-2024/03.jpg" alt="Kandy 2024 photo 3" loading="lazy" style="flex-grow: 1;" />
</div>
</div>

## Anuradhapura 2024

*Ancient stupas and quiet ruins.*

<div class="photoset">
<div class="photorow" style="height: 420px;">
  <img src="/images/photos/anuradhapura-2024/01.jpg" alt="Anuradhapura 2024 photo 1" loading="lazy" style="flex-grow: 1.8;" />
  <img src="/images/photos/anuradhapura-2024/02.jpg" alt="Anuradhapura 2024 photo 2" loading="lazy" style="flex-grow: 1;" />
</div>
<div class="photorow" style="height: 480px;">
  <img src="/images/photos/anuradhapura-2024/03.jpg" alt="Anuradhapura 2024 photo 3" loading="lazy" style="flex-grow: 1;" />
  <img src="/images/photos/anuradhapura-2024/04.jpg" alt="Anuradhapura 2024 photo 4" loading="lazy" style="flex-grow: 2;" />
</div>
</div>

<script>
(function () {
  // Dynamic filled mosaic, fully computed, no hand placement:
  // 1. stable-partition photos by measured orientation (aspect < 1: portrait)
  // 2. emit rows alternating [P,L] / [L,P] so the same orientation never
  //    stacks vertically; leftovers pair alike, a lone leftover joins the
  //    previous row; narrow screens stack singles in arranged order
  // 3. geometry per row from natural aspects (fill edge to edge, crop
  //    capped at 10% per side) + seam search against the row above
  var H_MAX = 520, CROP = 1.25, NARROW = 640;
  function rowHeight(aspects, W) {
    var s = 0, i;
    for (i = 0; i < aspects.length; i++) s += aspects[i];
    return W / s;
  }
  function layoutSet(set) {
    var W = set.clientWidth;
    if (!W) return;
    var imgs = Array.prototype.slice.call(set.querySelectorAll('img'));
    if (!imgs.length) return;
    var k;
    for (k = 0; k < imgs.length; k++) {
      if (!imgs[k].naturalWidth) return; // wait until all are loaded
    }
    while (set.firstChild) set.removeChild(set.firstChild);
    var P = [], L = [];
    imgs.forEach(function (img) {
      ((img.naturalWidth / img.naturalHeight) < 1 ? P : L).push(img);
    });
    var pairs = [], takeP = true, guard = 0;
    while ((P.length || L.length) && guard++ < 200) {
      var prow = [];
      if (takeP && P.length) {
        prow.push(P.shift());
        if (L.length) prow.push(L.shift());
      } else if (!takeP && L.length) {
        prow.push(L.shift());
        if (P.length) prow.push(P.shift());
      } else if (P.length >= 2) {
        prow.push(P.shift(), P.shift());
      } else if (L.length >= 2) {
        prow.push(L.shift(), L.shift());
      } else if (P.length) {
        prow.push(P.shift());
      } else if (L.length) {
        prow.push(L.shift());
      } else {
        break;
      }
      if (prow.length === 1 && pairs.length) {
        pairs[pairs.length - 1].push(prow[0]);
      } else {
        pairs.push(prow);
        takeP = !takeP;
      }
    }
    if (W < NARROW) {
      var flat = [];
      pairs.forEach(function (r) {
        r.forEach(function (im) { flat.push(im); });
      });
      pairs = flat.map(function (im) { return [im]; });
    }
    var rows = pairs.map(function (r) {
      return {
        imgs: r,
        a: r.map(function (img) { return img.naturalWidth / img.naturalHeight; })
      };
    });
    // Seam-aware pass: no magic offsets. Each row after the first searches
    // width distributions for the one that maximizes its seam distance
    // from the row above, subject only to the 10% per-side crop budget.
    function seamsOf(widths, W) {
      var out = [], acc = 0, i;
      for (i = 0; i < widths.length - 1; i++) {
        acc += widths[i];
        out.push(acc / W);
      }
      return out;
    }
    function maxSideCrop(aspects, widths, h) {
      var worst = 0, i;
      for (i = 0; i < aspects.length; i++) {
        var a = aspects[i], bw = widths[i], bh = h;
        var s = Math.max(bw / a, bh);
        var ch = Math.max(0, a * s - bw) / (2 * a * s);
        var cv = Math.max(0, s - bh) / (2 * s);
        worst = Math.max(worst, ch, cv);
      }
      return worst;
    }
    function minGap(seams, prev) {
      var best = Infinity, i, j;
      for (i = 0; i < seams.length; i++) {
        for (j = 0; j < prev.length; j++) {
          best = Math.min(best, Math.abs(seams[i] - prev[j]));
        }
      }
      return best;
    }
    var laid = rows.map(function (row) {
      var hNat = rowHeight(row.a, W), h = hNat, s = 1;
      if (hNat > H_MAX * CROP) { h = hNat; } // freak row: accept tall, no crop
      else if (hNat > H_MAX) { h = H_MAX; s = hNat / H_MAX; }
      return {
        imgs: row.imgs, a: row.a, h: h,
        widths: row.a.map(function (a) { return h * a * s; })
      };
    });
    for (var ri = 1; ri < laid.length; ri++) {
      var curL = laid[ri];
      if (curL.widths.length < 2) continue;
      var prevSeams = seamsOf(laid[ri - 1].widths, W);
      var bestT = 1, bestD = minGap(seamsOf(curL.widths, W), prevSeams);
      for (var t = 1.01; t <= 1.3; t += 0.01) {
        var cand = curL.widths.slice();
        cand[0] *= t;
        var rest = 0, m;
        for (m = 1; m < cand.length - 1; m++) rest += cand[m];
        cand[cand.length - 1] = W - cand[0] - rest;
        if (cand[cand.length - 1] <= 50) continue;
        if (maxSideCrop(curL.a, cand, curL.h) > 0.1001) continue;
        var d = minGap(seamsOf(cand, W), prevSeams);
        if (d > bestD) { bestD = d; bestT = t; }
      }
      if (bestT > 1) {
        curL.widths[0] *= bestT;
        var r2 = 0, m2;
        for (m2 = 1; m2 < curL.widths.length - 1; m2++) r2 += curL.widths[m2];
        curL.widths[curL.widths.length - 1] = W - curL.widths[0] - r2;
      }
    }
    laid.forEach(function (row) {
      var div = document.createElement('div');
      div.className = 'grow';
      row.imgs.forEach(function (img, i) {
        img.style.width = Math.round(row.widths[i]) + 'px';
        img.style.height = Math.round(row.h) + 'px';
        div.appendChild(img);
      });
      set.appendChild(div);
    });
  }
  function layoutAll() {
    document.querySelectorAll('.photoset').forEach(layoutSet);
  }
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(layoutAll, 150);
  });
  document.querySelectorAll('.photoset img').forEach(function (img) {
    if (!img.complete) img.addEventListener('load', layoutAll);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', layoutAll);
  } else {
    layoutAll();
  }
  window.addEventListener('load', layoutAll);
})();
</script>
