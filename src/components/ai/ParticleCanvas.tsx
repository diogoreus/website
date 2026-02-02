import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { trackEasterEggFound } from '../../scripts/analytics';

interface ParticleCanvasProps {
  className?: string;
  interactive?: boolean;
}

export default function ParticleCanvas({ className = '', interactive = true }: ParticleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, target: { x: 0, y: 0 } });
  const scrollRef = useRef(0);
  const idleTimeRef = useRef(0);
  const lastMouseMoveRef = useRef(Date.now());
  const convergenceStateRef = useRef<'idle' | 'converging' | 'exploding' | 'normal'>('normal');
  const convergenceTriggeredRef = useRef(false);

  const createParticles = useCallback((scene: THREE.Scene, renderer: THREE.WebGLRenderer) => {
    const particleCount = window.innerWidth < 768 ? 3000 : 8000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);

    // Create neural network-like clusters
    const clusters = 7;
    const particlesPerCluster = Math.floor(particleCount / clusters);

    for (let c = 0; c < clusters; c++) {
      // Cluster center position - spread across the viewport
      const clusterX = (Math.random() - 0.5) * 100;
      const clusterY = (Math.random() - 0.5) * 60;
      const clusterZ = (Math.random() - 0.5) * 40;

      for (let i = 0; i < particlesPerCluster; i++) {
        const index = c * particlesPerCluster + i;
        if (index >= particleCount) break;

        // Particles in a fuzzy sphere around cluster center
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = Math.random() * 20 + 5;

        positions[index * 3] = clusterX + radius * Math.sin(phi) * Math.cos(theta);
        positions[index * 3 + 1] = clusterY + radius * Math.sin(phi) * Math.sin(theta);
        positions[index * 3 + 2] = clusterZ + radius * Math.cos(phi);

        // Color gradient: purple to cyan with some variation
        const colorT = (c / clusters) + (Math.random() - 0.5) * 0.2;
        colors[index * 3] = 0.66 - colorT * 0.4;     // R
        colors[index * 3 + 1] = 0.33 + colorT * 0.6; // G
        colors[index * 3 + 2] = 0.93 + Math.random() * 0.07; // B

        // Size with more variation
        sizes[index] = Math.random() * 3 + 0.5;

        // Initial velocities for organic movement
        velocities[index * 3] = (Math.random() - 0.5) * 0.02;
        velocities[index * 3 + 1] = (Math.random() - 0.5) * 0.02;
        velocities[index * 3 + 2] = (Math.random() - 0.5) * 0.02;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    // Enhanced shader with more organic movement
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: renderer.getPixelRatio() },
        mousePos: { value: new THREE.Vector2(0, 0) },
        scrollProgress: { value: 0 },
        convergenceStrength: { value: 0.0 },
        explosionStrength: { value: 0.0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute vec3 velocity;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        uniform float pixelRatio;
        uniform vec2 mousePos;
        uniform float scrollProgress;
        uniform float convergenceStrength;
        uniform float explosionStrength;

        // Noise function for organic movement
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
        }

        void main() {
          vColor = color;

          vec3 pos = position;

          // Organic wave motion
          float wave1 = sin(pos.x * 0.05 + time * 0.5) * 3.0;
          float wave2 = cos(pos.y * 0.04 + time * 0.4) * 3.0;
          float wave3 = sin(pos.z * 0.06 + time * 0.3) * 2.0;

          pos.x += wave1 + velocity.x * time * 10.0;
          pos.y += wave2 + velocity.y * time * 10.0;
          pos.z += wave3 + velocity.z * time * 10.0;

          // Mouse repulsion effect (disabled during convergence/explosion)
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vec2 screenPos = worldPos.xy / worldPos.w;
          float mouseDist = length(screenPos - mousePos * 50.0);
          float mouseInfluence = smoothstep(30.0, 0.0, mouseDist) * (1.0 - convergenceStrength - explosionStrength);
          pos.xy += normalize(screenPos - mousePos * 50.0) * mouseInfluence * 5.0;

          // Convergence effect - particles attract to mouse position
          if (convergenceStrength > 0.0) {
            vec3 targetPos = vec3(mousePos.x * 50.0, mousePos.y * 30.0, 0.0);
            vec3 toTarget = targetPos - pos;
            float dist = length(toTarget);
            vec3 attractDir = normalize(toTarget);
            // Stronger attraction as convergence increases, with slight randomness
            float attractForce = convergenceStrength * min(dist * 0.8, 30.0);
            pos += attractDir * attractForce * (0.8 + noise(position) * 0.4);
          }

          // Explosion effect - particles scatter outward
          if (explosionStrength > 0.0) {
            vec3 center = vec3(mousePos.x * 50.0, mousePos.y * 30.0, 0.0);
            vec3 awayDir = normalize(pos - center + vec3(0.001)); // avoid zero vector
            float explosionForce = explosionStrength * 80.0 * (0.5 + noise(position) * 1.0);
            pos += awayDir * explosionForce;
          }

          // Breathing effect based on scroll
          float breathe = sin(time * 0.5 + scrollProgress * 6.28) * 0.1 + 1.0;
          pos *= breathe;

          // Pulse effect
          float pulse = sin(time * 2.0 + length(position) * 0.08) * 0.5 + 0.5;

          // Distance-based alpha
          float distFromCenter = length(position) / 60.0;
          vAlpha = 1.0 - distFromCenter * 0.3;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * pixelRatio * (350.0 / -mvPosition.z) * (0.7 + pulse * 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          // Circular particle with soft glow
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          // Core + glow
          float core = 1.0 - smoothstep(0.0, 0.2, dist);
          float glow = 1.0 - smoothstep(0.2, 0.5, dist);

          if (glow < 0.01) discard;

          // Enhanced glow effect
          vec3 glowColor = vColor * (1.0 + core * 1.5);

          // Add subtle color shift in glow
          glowColor.r += glow * 0.1;
          glowColor.b += core * 0.2;

          float alpha = (core * 0.9 + glow * 0.4) * vAlpha;
          gl_FragColor = vec4(glowColor, alpha * 0.85);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { geometry, material, positions };
  }, []);

  const createConnections = useCallback((positions: Float32Array, particleCount: number) => {
    const linePositions: number[] = [];
    const lineColors: number[] = [];

    // Dynamic connections based on proximity
    const connectionDistance = 12;
    const maxConnections = window.innerWidth < 768 ? 300 : 800;
    let connectionCount = 0;

    // Sample particles for connections (not all pairs)
    const sampleRate = Math.max(1, Math.floor(particleCount / 500));

    for (let i = 0; i < particleCount && connectionCount < maxConnections; i += sampleRate) {
      const x1 = positions[i * 3];
      const y1 = positions[i * 3 + 1];
      const z1 = positions[i * 3 + 2];

      for (let j = i + sampleRate; j < particleCount && connectionCount < maxConnections; j += sampleRate) {
        const x2 = positions[j * 3];
        const y2 = positions[j * 3 + 1];
        const z2 = positions[j * 3 + 2];

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < connectionDistance && Math.random() > 0.7) {
          linePositions.push(x1, y1, z1, x2, y2, z2);

          const intensity = 1 - distance / connectionDistance;
          // Gradient from purple to cyan
          lineColors.push(
            0.66 * intensity, 0.33 * intensity, 0.97 * intensity,
            0.13 * intensity, 0.83 * intensity, 0.93 * intensity
          );
          connectionCount++;
        }
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: lineGeometry, material: lineMaterial };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera - wider FOV for more immersive feel
    const camera = new THREE.PerspectiveCamera(85, width / height, 0.1, 1000);
    camera.position.z = 60;
    cameraRef.current = camera;

    // Renderer with better quality
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create particles
    const particleCount = window.innerWidth < 768 ? 3000 : 8000;
    const { geometry, material, positions } = createParticles(scene, renderer);
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // Create connections
    const { geometry: lineGeometry, material: lineMaterial } = createConnections(positions, particleCount);
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);
    linesRef.current = lines;

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      if (!interactive) return;
      mouseRef.current.target.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.target.y = -(event.clientY / window.innerHeight) * 2 + 1;
      lastMouseMoveRef.current = Date.now();

      // Reset convergence if mouse moves during convergence
      if (convergenceStateRef.current === 'converging') {
        convergenceStateRef.current = 'normal';
        (material.uniforms.convergenceStrength as { value: number }).value = 0;
      }
    };

    // Scroll tracking
    const handleScroll = () => {
      const section = document.getElementById('era-ai');
      if (section) {
        const rect = section.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, 1 - rect.top / window.innerHeight));
        scrollRef.current = progress;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;
      const now = Date.now();
      (material.uniforms.time as { value: number }).value = time;
      (material.uniforms.scrollProgress as { value: number }).value = scrollRef.current;

      // Track idle time
      const idleTime = (now - lastMouseMoveRef.current) / 1000;

      // Check if we should start convergence (10 seconds idle, AI section visible)
      if (idleTime >= 10 && convergenceStateRef.current === 'normal' && !convergenceTriggeredRef.current && scrollRef.current > 0.3) {
        convergenceStateRef.current = 'converging';
        convergenceTriggeredRef.current = true;
        trackEasterEggFound('particle_convergence');
      }

      // Handle convergence animation
      const convergenceUniform = material.uniforms.convergenceStrength as { value: number };
      const explosionUniform = material.uniforms.explosionStrength as { value: number };

      if (convergenceStateRef.current === 'converging') {
        // Gradually increase convergence over 4 seconds
        convergenceUniform.value = Math.min(convergenceUniform.value + 0.004, 1.0);

        // After reaching full convergence, trigger explosion
        if (convergenceUniform.value >= 1.0) {
          setTimeout(() => {
            convergenceStateRef.current = 'exploding';
            convergenceUniform.value = 0;
          }, 500);
        }
      } else if (convergenceStateRef.current === 'exploding') {
        // Quick explosion
        explosionUniform.value = Math.min(explosionUniform.value + 0.05, 1.0);

        if (explosionUniform.value >= 1.0) {
          // Decay explosion and return to normal
          setTimeout(() => {
            convergenceStateRef.current = 'normal';
            // Allow re-triggering after 30 seconds
            setTimeout(() => {
              convergenceTriggeredRef.current = false;
            }, 30000);
          }, 200);
        }
      } else {
        // Decay both uniforms when normal
        convergenceUniform.value *= 0.95;
        explosionUniform.value *= 0.92;
        if (convergenceUniform.value < 0.01) convergenceUniform.value = 0;
        if (explosionUniform.value < 0.01) explosionUniform.value = 0;
      }

      // Smooth mouse following
      mouseRef.current.x += (mouseRef.current.target.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.target.y - mouseRef.current.y) * 0.05;
      (material.uniforms.mousePos as { value: THREE.Vector2 }).value.set(
        mouseRef.current.x,
        mouseRef.current.y
      );

      // Gentle rotation based on mouse
      particles.rotation.y += (mouseRef.current.x * 0.15 - particles.rotation.y) * 0.02;
      particles.rotation.x += (mouseRef.current.y * 0.1 - particles.rotation.x) * 0.02;

      // Sync lines rotation
      lines.rotation.copy(particles.rotation);

      // Slow continuous rotation
      particles.rotation.z += 0.0005;
      lines.rotation.z = particles.rotation.z;

      // Subtle camera movement
      camera.position.x += (mouseRef.current.x * 5 - camera.position.x) * 0.01;
      camera.position.y += (mouseRef.current.y * 3 - camera.position.y) * 0.01;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameRef.current);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, [createParticles, createConnections, interactive]);

  return (
    <div
      ref={containerRef}
      className={`particle-canvas ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
}
