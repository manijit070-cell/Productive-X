/**
 * Framer Motion / Motion Web Animation System for Productive-X
 * Powered by official Motion (window.Motion) engine
 */

export const MotionKit = {
  // Check if Motion is available
  isReady() {
    return typeof window !== 'undefined' && !!window.Motion;
  },

  // Animate numeric counter with smooth spring / ease-out physics
  animateCounter(element, targetValue, options = {}) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (!el) return;

    const {
      prefix = '',
      suffix = '',
      duration = 800,
      isCurrency = false
    } = options;

    const targetNum = Number(targetValue) || 0;
    const startNum = Number(el.getAttribute('data-raw-value')) || 0;
    el.setAttribute('data-raw-value', targetNum);

    const formatVal = (num) => {
      if (isCurrency) {
        if (num < 0) {
          return `-${prefix}${Math.abs(num).toLocaleString('en-IN')}${suffix}`;
        }
        return `${prefix}${num.toLocaleString('en-IN')}${suffix}`;
      }
      return `${prefix}${num}${suffix}`;
    };

    if (startNum === targetNum) {
      el.textContent = formatVal(targetNum);
      return;
    }

    const startTime = performance.now();
    // Spring ease-out exponential curve
    const easeOutExp = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutExp(progress);
      const current = Math.round(startNum + (targetNum - startNum) * eased);

      el.textContent = formatVal(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatVal(targetNum);
      }
    }

    requestAnimationFrame(step);
  },

  // Staggered card / element entrance
  staggerCards(targets, options = {}) {
    if (!this.isReady() || !window.Motion.animate) return;

    const elements = typeof targets === 'string' 
      ? Array.from(document.querySelectorAll(targets)) 
      : (Array.isArray(targets) ? targets : [targets]);

    if (!elements.length) return;

    const {
      y = 18,
      duration = 0.55,
      staggerDelay = 0.07,
      scale = 0.98
    } = options;

    elements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = `translateY(${y}px) scale(${scale})`;
    });

    try {
      window.Motion.animate(
        elements,
        {
          opacity: [0, 1],
          y: [y, 0],
          scale: [scale, 1]
        },
        {
          delay: window.Motion.stagger(staggerDelay),
          duration,
          easing: [0.22, 1, 0.36, 1]
        }
      );
    } catch (e) {
      // Direct apply if any batch error
      elements.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }
  },

  // Smooth page/section entrance transition
  pageTransition(sectionElement) {
    if (!sectionElement || !this.isReady() || !window.Motion.animate) return;

    try {
      window.Motion.animate(
        sectionElement,
        {
          opacity: [0, 1],
          y: [14, 0],
          scale: [0.99, 1]
        },
        {
          duration: 0.38,
          easing: [0.25, 1, 0.5, 1]
        }
      );
    } catch (e) {
      sectionElement.style.opacity = '1';
      sectionElement.style.transform = 'none';
    }
  },

  // Smooth progress bar fill
  animateProgressBar(element, percent, duration = 0.8) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (!el) return;

    const targetPercent = Math.min(100, Math.max(0, Number(percent) || 0));

    if (this.isReady() && window.Motion.animate) {
      window.Motion.animate(
        el,
        {
          width: [`0%`, `${targetPercent}%`]
        },
        {
          duration,
          easing: [0.34, 1.56, 0.64, 1] // Gentle spring overshoot
        }
      );
    } else {
      el.style.width = `${targetPercent}%`;
    }
  },

  // Interactive bounce click on any element
  springBounce(element) {
    if (!element || !this.isReady() || !window.Motion.animate) return;
    try {
      window.Motion.animate(
        element,
        {
          scale: [1, 0.94, 1.03, 1]
        },
        {
          duration: 0.35,
          easing: [0.34, 1.56, 0.64, 1]
        }
      );
    } catch (e) {}
  },

  // Celebrate with confetti
  burstConfetti(originElement = null) {
    if (typeof window.confetti === 'function') {
      try {
        if (originElement) {
          const rect = originElement.getBoundingClientRect();
          const x = (rect.left + rect.width / 2) / window.innerWidth;
          const y = (rect.top + rect.height / 2) / window.innerHeight;
          window.confetti({
            particleCount: 45,
            spread: 60,
            origin: { x, y },
            colors: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899']
          });
        } else {
          window.confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899']
          });
        }
      } catch (e) {
        console.warn('Confetti error:', e);
      }
    }
  }
};
