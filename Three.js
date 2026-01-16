<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini Gesture Particles</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
            }
        }
    </script>
    <style>
        body { margin: 0; overflow: hidden; background: #050505; font-family: 'Inter', sans-serif; }
        canvas { display: block; }
        .glass {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
        }
        #video-container {
            transform: scaleX(-1);
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 240px;
            height: 180px;
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        .loader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>

    <div id="loading-overlay" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <div class="loader mb-4"></div>
        <p class="text-white font-mono">Initializing Neural Engines & WebGL...</p>
    </div>

    <div class="fixed top-6 left-6 z-40 flex flex-col gap-4">
        <div class="glass p-6 text-white max-w-xs">
            <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Gemini Particles</h1>
            <p class="text-xs opacity-70 mt-1">Senior Creative Dev Edition</p>
            <div id="gesture-badge" class="mt-4 px-3 py-1 bg-white/10 rounded-full text-center font-mono text-sm border border-white/20">
                Detecting Gesture...
            </div>
            <div class="mt-4 space-y-2 text-[10px] uppercase tracking-widest opacity-50">
                <p>✊ Fist: Saturn</p>
                <p>✌️ V-Sign: 3D "I Love You"</p>
                <p>🤌 Heart: Pink Heart</p>
                <p>🖐 Open: Rainbow Sphere</p>
            </div>
        </div>

        <div class="flex gap-2">
            <button onclick="toggleAIModal()" class="glass px-4 py-2 text-white hover:bg-white/20 transition">✨ AI Magic</button>
            <button onclick="document.documentElement.requestFullscreen()" class="glass px-4 py-2 text-white hover:bg-white/20 transition">⛶</button>
            <input type="color" id="baseColor" value="#00ffff" class="h-10 w-10 rounded bg-transparent border-none cursor-pointer">
        </div>
    </div>

    <div id="ai-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div class="glass p-8 w-full max-w-md">
            <h2 class="text-white text-xl mb-4">Gemini Shape Generator</h2>
            <input type="password" id="api-key" placeholder="Enter Gemini API Key" class="w-full bg-black/40 border border-white/20 p-2 rounded text-white mb-4">
            <textarea id="ai-prompt" placeholder="e.g., A double helix DNA spiral..." class="w-full h-32 bg-black/40 border border-white/20 p-2 rounded text-white mb-4"></textarea>
            <div class="flex justify-end gap-2">
                <button onclick="toggleAIModal()" class="px-4 py-2 text-white/60">Cancel</button>
                <button id="generate-btn" class="bg-blue-600 px-6 py-2 rounded text-white font-bold hover:bg-blue-500">Generate</button>
            </div>
        </div>
    </div>

    <div id="video-container">
        <video id="webcam" autoplay playsinline></video>
    </div>

    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
        import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
        import { FontLoader } from 'three/addons/loaders/FontLoader.js';
        import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
        import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

        // --- Configuration ---
        const PARTICLE_COUNT = 20000;
        let scene, camera, renderer, composer, particles, sampler;
        let targetPositions = new Float32Array(PARTICLE_COUNT * 3);
        let targetColors = new Float32Array(PARTICLE_COUNT * 3);
        const clock = new THREE.Clock();

        // --- Initialization ---
        async function init() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 35;

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);

            // Post Processing
            const renderScene = new RenderPass(scene, camera);
            const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
            composer = new EffectComposer(renderer);
            composer.addPass(renderScene);
            composer.addPass(bloomPass);

            // Particle System
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(PARTICLE_COUNT * 3);
            const colors = new Float32Array(PARTICLE_COUNT * 3);

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 100;
                positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
                targetPositions[i * 3] = positions[i * 3];
                targetPositions[i * 3 + 1] = positions[i * 3 + 1];
                targetPositions[i * 3 + 2] = positions[i * 3 + 2];
            }

            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const mat = new THREE.PointsMaterial({
                size: 0.12,
                vertexColors: true,
                transparent: true,
                blending: THREE.AdditiveBlending
            });

            particles = new THREE.Points(geo, mat);
            scene.add(particles);

            // Load Font & Setup Gestures
            await loadResources();
            initMediaPipe();
            animate();
            
            document.getElementById('loading-overlay').style.display = 'none';
        }

        async function loadResources() {
            const loader = new FontLoader();
            return new Promise((resolve) => {
                loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
                    window.font = font;
                    resolve();
                });
            });
        }

        // --- Shapes Generation ---
        const Shapes = {
            disperse: () => {
                const color = new THREE.Color();
                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    const r = 20 + Math.random() * 5;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    targetPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                    targetPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                    targetPositions[i * 3 + 2] = r * Math.cos(phi);
                    color.setHSL(Math.random(), 0.7, 0.5);
                    targetColors[i * 3] = color.r;
                    targetColors[i * 3 + 1] = color.g;
                    targetColors[i * 3 + 2] = color.b;
                }
            },
            saturn: () => {
                const color = new THREE.Color();
                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    if (i < PARTICLE_COUNT * 0.6) { // Sphere
                        const r = 8 * Math.pow(Math.random(), 1/3);
                        const theta = Math.random() * Math.PI * 2;
                        const phi = Math.acos(2 * Math.random() - 1);
                        targetPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                        targetPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                        targetPositions[i * 3 + 2] = r * Math.cos(phi);
                        color.setHex(0x4444ff);
                    } else { // Rings
                        const r = 12 + Math.random() * 6;
                        const theta = Math.random() * Math.PI * 2;
                        targetPositions[i * 3] = r * Math.cos(theta);
                        targetPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.5 + (r * Math.sin(theta) * 0.5); // Tilt
                        targetPositions[i * 3 + 2] = r * Math.sin(theta);
                        color.setHex(0xd4af37);
                    }
                    targetColors[i * 3] = color.r;
                    targetColors[i * 3 + 1] = color.g;
                    targetColors[i * 3 + 2] = color.b;
                }
            },
            heart: () => {
                const color = new THREE.Color(0xff69b4);
                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    const t = Math.random() * Math.PI * 2;
                    const x = 16 * Math.pow(Math.sin(t), 3);
                    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
                    const z = (Math.random() - 0.5) * 5;
                    targetPositions[i * 3] = x * 0.8;
                    targetPositions[i * 3 + 1] = y * 0.8;
                    targetPositions[i * 3 + 2] = z;
                    targetColors[i * 3] = color.r;
                    targetColors[i * 3 + 1] = color.g;
                    targetColors[i * 3 + 2] = color.b;
                }
            },
            text: () => {
                const textGeo = new TextGeometry('I LOVE YOU', {
                    font: window.font,
                    size: 5,
                    height: 2,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.5,
                    bevelSize: 0.3
                });
                textGeo.center();
                const mesh = new THREE.Mesh(textGeo);
                const sampler = new MeshSurfaceSampler(mesh).build();
                const _pos = new THREE.Vector3();
                const color = new THREE.Color(0xffd700);

                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    sampler.sample(_pos);
                    targetPositions[i * 3] = _pos.x;
                    targetPositions[i * 3 + 1] = _pos.y;
                    targetPositions[i * 3 + 2] = _pos.z;
                    targetColors[i * 3] = color.r;
                    targetColors[i * 3 + 1] = color.g;
                    targetColors[i * 3 + 2] = color.b;
                }
            }
        };

        // --- MediaPipe Hand Tracking ---
        async function initMediaPipe() {
            const video = document.getElementById('webcam');
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;

            const { HandLandmarker, FilesetResolver } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0");
            const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
            const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` },
                runningMode: "VIDEO",
                numHands: 1
            });

            async function predict() {
                const results = handLandmarker.detectForVideo(video, performance.now());
                if (results.landmarks && results.landmarks.length > 0) {
                    processGesture(results.landmarks[0]);
                }
                requestAnimationFrame(predict);
            }
            predict();
        }

        let lastGesture = "";
        function processGesture(landmarks) {
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const ringTip = landmarks[16];
            const pinkyTip = landmarks[20];
            const wrist = landmarks[0];

            // Proximity check for Finger Heart
            const distThumbIndex = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            const isFist = indexTip.y > landmarks[6].y && middleTip.y > landmarks[10].y && ringTip.y > landmarks[14].y;
            const isV = indexTip.y < landmarks[6].y && middleTip.y < landmarks[10].y && ringTip.y > landmarks[14].y;
            const isOpen = indexTip.y < landmarks[6].y && pinkyTip.y < landmarks[18].y;

            let currentGesture = "";
            if (distThumbIndex < 0.05 && middleTip.y > landmarks[10].y) currentGesture = "HEART";
            else if (isFist) currentGesture = "FIST";
            else if (isV) currentGesture = "V-SIGN";
            else if (isOpen) currentGesture = "OPEN";

            if (currentGesture && currentGesture !== lastGesture) {
                lastGesture = currentGesture;
                document.getElementById('gesture-badge').innerText = lastGesture;
                if (currentGesture === "FIST") Shapes.saturn();
                if (currentGesture === "V-SIGN") Shapes.text();
                if (currentGesture === "HEART") Shapes.heart();
                if (currentGesture === "OPEN") Shapes.disperse();
            }
        }

        // --- Animation Loop ---
        function animate() {
            requestAnimationFrame(animate);
            const posAttr = particles.geometry.attributes.position;
            const colAttr = particles.geometry.attributes.color;

            for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
                posAttr.array[i] += (targetPositions[i] - posAttr.array[i]) * 0.1;
                colAttr.array[i] += (targetColors[i] - colAttr.array[i]) * 0.1;
            }
            posAttr.needsUpdate = true;
            colAttr.needsUpdate = true;

            particles.rotation.y += 0.002;
            composer.render();
        }

        // --- Gemini Integration ---
        window.toggleAIModal = () => {
            const m = document.getElementById('ai-modal');
            m.classList.toggle('hidden');
        };

        document.getElementById('generate-btn').onclick = async () => {
            const key = document.getElementById('api-key').value;
            const prompt = document.getElementById('ai-prompt').value;
            const btn = document.getElementById('generate-btn');

            if (!key) return alert("Please enter an API Key");
            
            btn.innerText = "Thinking...";
            btn.disabled = true;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `Write a Javascript loop for a particle system of ${PARTICLE_COUNT} particles. Update 'targetPositions' (x,y,z) and 'targetColors' (r,g,b). Use math for the shape: ${prompt}. Return ONLY the raw javascript code for the loop. Use variables i, targetPositions, targetColors.` }] }]
                    })
                });
                
                const data = await response.json();
                let code = data.candidates[0].content.parts[0].text;
                code = code.replace(/```javascript|```/g, ""); // Clean markdown
                
                const func = new Function('targetPositions', 'targetColors', 'PARTICLE_COUNT', 'THREE', code);
                func(targetPositions, targetColors, PARTICLE_COUNT, THREE);
                
                toggleAIModal();
            } catch (e) {
                console.error(e);
                alert("AI Error: " + e.message);
            } finally {
                btn.innerText = "Generate";
                btn.disabled = false;
            }
        };

        init();
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        });

    </script>
</body>
</html>