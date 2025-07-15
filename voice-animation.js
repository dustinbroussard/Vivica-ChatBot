class VoiceAnimation {
  constructor() {
    this.animationContainer = null;
    this.canvas = null;
    this.ctx = null;
    
    // Visual state
    this.volume = 0;
    this.targetVolume = 0;
    this.currentMoodColor = '#00FF88';
    this.targetMoodColor = '#00FF88';
    this.pulseOffset = 0;
    this.particles = [];
    this.isActive = false;
    
    this.initElements();
  }

  initElements() {
    // Create container div
    this.animationContainer = document.createElement('div');
    this.animationContainer.id = 'voice-animation-container';
    this.animationContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, #222244 0%, black 80%);
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      color: white;
      z-index: 1000;
      display: none;
    `;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: none;
      border: none;
      color: white;
      font-size: 32px;
      cursor: pointer;
      z-index: 1001;
    `;
    closeBtn.addEventListener('click', () => this.hide());
    
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'voice-canvas';
    this.canvas.style.cssText = `
      display: block;
      width: 100vw;
      height: 100vh;
      touch-action: none;
    `;
    
    // Create name display
    const nameDiv = document.createElement('div');
    nameDiv.className = 'vivica-name';
    nameDiv.textContent = 'VIVICA';
    nameDiv.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      font-size: clamp(20px, 5vw, 32px);
      font-weight: bold;
      letter-spacing: 3px;
      opacity: 0.9;
      text-shadow: 0 0 20px rgba(255,255,255,0.5);
      pointer-events: none;
    `;

    this.animationContainer.appendChild(this.canvas);
    this.animationContainer.appendChild(nameDiv);
    this.animationContainer.appendChild(closeBtn);
    document.body.appendChild(this.animationContainer);

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Start animation loop
    requestAnimationFrame(() => this.animate());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  show() {
    this.animationContainer.style.display = 'block';
    this.isActive = true;
  }

  hide() {
    this.animationContainer.style.display = 'none';
    this.isActive = false;
  }

  setState(state) {
    switch(state) {
      case 'listening':
        this.updateMood('#00FF88');
        this.targetVolume = 0.2;
        break;
      case 'processing':
        this.updateMood('#FFD700');
        this.targetVolume = 0.3;
        break;
      case 'speaking':
        this.updateMood('#FF6B6B');
        this.targetVolume = 0.5;
        break;
      case 'error':
        this.updateMood('#FF4444');
        this.targetVolume = 0;
        setTimeout(() => this.setState('listening'), 3000);
        break;
    }
  }

  updateMood(color) {
    this.targetMoodColor = color;
    this.animationContainer.style.background = `radial-gradient(circle, ${color}22 0%, black 80%)`;
  }

  animate() {
    if (!this.isActive) {
      requestAnimationFrame(() => this.animate());
      return;
    }

    // Smooth transitions
    this.volume += (this.targetVolume - this.volume) * 0.1;
    this.currentMoodColor = this.lerpColor(this.currentMoodColor, this.targetMoodColor, 0.05);
    this.pulseOffset += 0.03;

    this.drawOrb();
    requestAnimationFrame(() => this.animate());
  }

  drawOrb() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.15;
    const radius = baseRadius + this.volume * (baseRadius * 2) + Math.sin(this.pulseOffset) * (baseRadius * 0.2);
    const x = this.canvas.width / 2;
    const y = this.canvas.height / 2;

    // Outer glow
    const outerGlow = this.ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 2.5);
    outerGlow.addColorStop(0, `${this.currentMoodColor}40`);
    outerGlow.addColorStop(0.5, `${this.currentMoodColor}20`);
    outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    
    this.ctx.beginPath();
    this.ctx.fillStyle = outerGlow;
    this.ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Main orb
    const gradient = this.ctx.createRadialGradient(x, y, 10, x, y, radius);
    gradient.addColorStop(0, `${this.currentMoodColor}CC`);
    gradient.addColorStop(0.4, `${this.currentMoodColor}88`);
    gradient.addColorStop(0.8, `${this.currentMoodColor}44`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    this.ctx.beginPath();
    this.ctx.fillStyle = gradient;
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Add particles if needed
    if (this.volume > 0.05) {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = radius * (0.5 + Math.random() * 0.5);
        this.particles.push(new Particle(
          x + Math.cos(angle) * distance,
          y + Math.sin(angle) * distance
        ));
      }
    }

    // Update particles
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.update();
      p.draw(this.ctx, this.currentMoodColor);
    });
  }

  lerpColor(color1, color2, factor) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.life = 1.0;
    this.size = Math.random() * 3 + 1;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.01;
    this.vx *= 0.99;
    this.vy *= 0.99;
  }
  
  draw(ctx, color) {
    const alpha = this.life * 0.6;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export const voiceAnimation = new VoiceAnimation();
