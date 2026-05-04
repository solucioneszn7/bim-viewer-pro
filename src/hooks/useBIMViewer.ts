import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/* ─── Types ─── */

export interface GeometryDimensions {
  length: number;
  width: number;
  height: number;
  area: number;
  volume: number;
}

export interface BIMElement {
  expressID: number;
  name: string;
  type: string;
  category: string;
  dimensions: GeometryDimensions;
  properties: Record<string, any>;
}

export interface BCFViewpoint {
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  fieldOfView?: number;
}

export interface BIMIssue {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  elementId?: number;
  elementName?: string;
  author: string;
  date: string;
  screenshot?: string;
  viewpoint?: BCFViewpoint;
  comments: { author: string; date: string; text: string }[];
}

export type ToolMode = "select" | "measure" | "clip" | null;
export type NavMode = "orbit" | "firstperson";

/* ─── Helpers ─── */

function formatLength(meters: number): string {
  if (meters < 0.001) return `${(meters * 1000).toFixed(2)} mm`;
  if (meters < 1) return `${(meters * 100).toFixed(1)} cm`;
  if (meters < 1000) return `${meters.toFixed(2)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function calculateDimensions(mesh: THREE.Mesh): GeometryDimensions {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());

  /* Sort dimensions: length ≥ width ≥ height/thickness */
  const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
  const length = dims[0];
  const width = dims[1];
  const height = dims[2];

  /* Approximate surface area (box surface) and volume */
  const area = 2 * (length * width + length * height + width * height);
  const volume = length * width * height;

  return { length, width, height, area, volume };
}

/* ─── Hook ─── */

export function useBIMViewer(containerRef: React.RefObject<HTMLDivElement | null>) {
  /* Scene refs */
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    meshes: THREE.Mesh[];
    labels: THREE.Group;
    measurements: THREE.Group;
    clipPlanes: THREE.Group;
    animationId: number;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  } | null>(null);

  /* State */
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedElement, setSelectedElement] = useState<BIMElement | null>(null);
  const [elements, setElements] = useState<BIMElement[]>([]);
  const [issues, setIssues] = useState<BIMIssue[]>([]);
  const [models, setModels] = useState<string[]>([]);

  /* Tool modes */
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [activeMeasurements, setActiveMeasurements] = useState<{ id: number; distance: string; from: string; to: string }[]>([]);
  const [activeClipPlanes, setActiveClipPlanes] = useState<{ id: number; name: string }[]>([]);

  /* Visibility */
  const [hiddenMeshes, setHiddenMeshes] = useState<Set<number>>(new Set());
  const [isolatedMesh, setIsolatedMesh] = useState<number | null>(null);
  const [_visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set());

  /* Filters */
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  /* Measurement state */
  const measurePointsRef = useRef<THREE.Vector3[]>([]);
  const measureLineRef = useRef<THREE.Line | null>(null);

  /* Navigation mode */
  const [navMode, setNavModeState] = useState<NavMode>("orbit");
  const navModeRef = useRef<NavMode>("orbit");
  const keysRef = useRef(new Set<string>());
  const fpStateRef = useRef({ dragging: false, lastX: 0, lastY: 0, yaw: Math.PI, pitch: 0 });

  /* ─── Init ─── */
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const container = containerRef.current;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    /* Camera */
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(20, 16, 20);

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    /* Controls */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 4, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    /* Lights */
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(15, 25, 15);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xaaccff, 0.35);
    dir2.position.set(-15, 15, -15);
    scene.add(dir2);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    scene.add(hemi);

    /* Grid */
    scene.add(new THREE.GridHelper(50, 50, 0x475569, 0x334155));
    scene.add(new THREE.AxesHelper(3));

    /* Groups */
    const labels = new THREE.Group();
    scene.add(labels);
    const measurements = new THREE.Group();
    scene.add(measurements);
    const clipPlanes = new THREE.Group();
    scene.add(clipPlanes);

    const meshes: THREE.Mesh[] = [];
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneRef.current = {
      scene, camera, renderer, controls,
      meshes, labels, measurements, clipPlanes,
      animationId: 0, raycaster, mouse,
    };

    /* Animation */
    const animate = () => {
      const id = requestAnimationFrame(animate);
      if (sceneRef.current) sceneRef.current.animationId = id;

      if (navModeRef.current === "firstperson") {
        const speed = 0.1;
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
        if (keysRef.current.has("KeyW") || keysRef.current.has("ArrowUp")) camera.position.addScaledVector(fwd, speed);
        if (keysRef.current.has("KeyS") || keysRef.current.has("ArrowDown")) camera.position.addScaledVector(fwd, -speed);
        if (keysRef.current.has("KeyA") || keysRef.current.has("ArrowLeft")) camera.position.addScaledVector(right, -speed);
        if (keysRef.current.has("KeyD") || keysRef.current.has("ArrowRight")) camera.position.addScaledVector(right, speed);
        camera.position.y = Math.max(1.7, camera.position.y);
      } else {
        controls.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    /* Resize */
    const onResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    window.addEventListener("resize", onResize);

    /* First-person keyboard */
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current.add(e.code); };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.code); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    /* First-person mouse look (drag on canvas) */
    const onFPMouseDown = (e: MouseEvent) => {
      if (navModeRef.current === "firstperson" && e.button === 0) {
        fpStateRef.current.dragging = true;
        fpStateRef.current.lastX = e.clientX;
        fpStateRef.current.lastY = e.clientY;
      }
    };
    const onFPMouseMove = (e: MouseEvent) => {
      if (navModeRef.current !== "firstperson" || !fpStateRef.current.dragging) return;
      const dx = e.clientX - fpStateRef.current.lastX;
      const dy = e.clientY - fpStateRef.current.lastY;
      fpStateRef.current.lastX = e.clientX;
      fpStateRef.current.lastY = e.clientY;
      fpStateRef.current.yaw -= dx * 0.003;
      fpStateRef.current.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, fpStateRef.current.pitch - dy * 0.003));
      camera.quaternion.setFromEuler(new THREE.Euler(fpStateRef.current.pitch, fpStateRef.current.yaw, 0, "YXZ"));
    };
    const onFPMouseUp = () => { fpStateRef.current.dragging = false; };
    renderer.domElement.addEventListener("mousedown", onFPMouseDown);
    renderer.domElement.addEventListener("mousemove", onFPMouseMove);
    renderer.domElement.addEventListener("mouseup", onFPMouseUp);

    setIsInitialized(true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("mousedown", onFPMouseDown);
      renderer.domElement.removeEventListener("mousemove", onFPMouseMove);
      renderer.domElement.removeEventListener("mouseup", onFPMouseUp);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        renderer.dispose();
        if (renderer.domElement.parentElement) {
          renderer.domElement.remove();
        }
      }
    };
  }, []);

  /* ─── Sample Building ─── */
  const loadSampleModel = useCallback(() => {
    if (!sceneRef.current) return;
    const { scene, meshes } = sceneRef.current;

    /* Clear existing sample meshes */
    meshes.forEach(m => { scene.remove(m); });
    meshes.length = 0;

    /* Collect categories */
    const cats = new Set<string>();

    const addMesh = (
      geo: THREE.BufferGeometry,
      color: number,
      pos: [number, number, number],
      name: string,
      type: string,
      category: string,
    ) => {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.name = name;
      mesh.userData = { type, category, originalColor: color };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshes.push(mesh);
      cats.add(category);
      return mesh;
    };

    /* Foundation */
    addMesh(new THREE.BoxGeometry(24, 0.5, 18), 0x44aa77, [0, 0.25, 0], "Foundation Slab", "IfcSlab", "Foundation");

    /* Floor 1 */
    addMesh(new THREE.BoxGeometry(22, 0.3, 16), 0xccccc0, [0, 3.15, 0], "Floor 1 Slab", "IfcSlab", "Floor");

    /* Floor 2 */
    addMesh(new THREE.BoxGeometry(22, 0.3, 16), 0xccccc0, [0, 6.15, 0], "Floor 2 Slab", "IfcSlab", "Floor");

    /* Roof */
    addMesh(new THREE.BoxGeometry(22, 0.3, 16), 0xcc6633, [0, 9.15, 0], "Roof Slab", "IfcRoof", "Roof");

    /* Columns */
    const colPos = [
      { x: -8, z: -6 }, { x: -4, z: -6 }, { x: 0, z: -6 }, { x: 4, z: -6 }, { x: 8, z: -6 },
      { x: -8, z: 0 }, { x: -4, z: 0 }, { x: 0, z: 0 }, { x: 4, z: 0 }, { x: 8, z: 0 },
      { x: -8, z: 6 }, { x: -4, z: 6 }, { x: 0, z: 6 }, { x: 4, z: 6 }, { x: 8, z: 6 },
    ];
    colPos.forEach(({ x, z }, i) => {
      addMesh(new THREE.BoxGeometry(0.4, 2.7, 0.4), 0x777777, [x, 1.65, z], `Column ${i + 1} F1`, "IfcColumn", "Column");
      addMesh(new THREE.BoxGeometry(0.4, 2.7, 0.4), 0x777777, [x, 4.65, z], `Column ${i + 1} F2`, "IfcColumn", "Column");
    });

    /* Walls L1 */
    const wCol = 0xddd5c0;
    addMesh(new THREE.BoxGeometry(22, 2.6, 0.25), wCol, [0, 1.55, 7.875], "Wall - Front L1", "IfcWall", "Exterior Wall");
    addMesh(new THREE.BoxGeometry(22, 2.6, 0.25), wCol, [0, 1.55, -7.875], "Wall - Back L1", "IfcWall", "Exterior Wall");
    addMesh(new THREE.BoxGeometry(0.25, 2.6, 16), wCol, [-10.875, 1.55, 0], "Wall - Left L1", "IfcWall", "Exterior Wall");
    addMesh(new THREE.BoxGeometry(0.25, 2.6, 16), wCol, [10.875, 1.55, 0], "Wall - Right L1", "IfcWall", "Exterior Wall");

    /* Walls L2 */
    addMesh(new THREE.BoxGeometry(22, 2.6, 0.25), wCol, [0, 4.55, 7.875], "Wall - Front L2", "IfcWall", "Exterior Wall");
    addMesh(new THREE.BoxGeometry(22, 2.6, 0.25), wCol, [0, 4.55, -7.875], "Wall - Back L2", "IfcWall", "Exterior Wall");
    addMesh(new THREE.BoxGeometry(0.25, 2.6, 16), wCol, [-10.875, 4.55, 0], "Wall - Left L2", "IfcWall", "Exterior Wall");
    addMesh(new THREE.BoxGeometry(0.25, 2.6, 16), wCol, [10.875, 4.55, 0], "Wall - Right L2", "IfcWall", "Exterior Wall");

    /* Windows */
    const winCol = 0x33aadd;
    [-5, 0, 5].forEach((x, i) => {
      addMesh(new THREE.BoxGeometry(1.8, 1.3, 0.3), winCol, [x, 1.65, 7.9], `Window ${i + 1} L1`, "IfcWindow", "Window");
      addMesh(new THREE.BoxGeometry(1.8, 1.3, 0.3), winCol, [x, 4.65, 7.9], `Window ${i + 4} L2`, "IfcWindow", "Window");
    });

    /* Doors */
    addMesh(new THREE.BoxGeometry(1.4, 2.1, 0.3), 0x995533, [-7, 1.1, 7.9], "Door 1", "IfcDoor", "Door");
    addMesh(new THREE.BoxGeometry(1.4, 2.1, 0.3), 0x995533, [3, 1.1, 7.9], "Door 2", "IfcDoor", "Door");

    /* Stairs */
    for (let i = 0; i < 12; i++) {
      addMesh(new THREE.BoxGeometry(1.5, 0.15, 0.4), 0x888888, [6, 0.2 + i * 0.26, -7 + i * 0.6], `Step ${i + 1}`, "IfcStair", "Stair");
    }

    /* HVAC Duct (MEP sample) */
    addMesh(new THREE.BoxGeometry(0.8, 0.5, 8), 0xdddddd, [0, 7.8, 0], "HVAC Main Duct", "IfcDistributionFlowElement", "MEP");

    /* Elements state */
    const sampleElements: BIMElement[] = meshes.map((m, idx) => {
      const dims = calculateDimensions(m);
      return {
        expressID: m.id || idx + 1,
        name: m.name,
        type: m.userData.type || "Unknown",
        category: m.userData.category || "Uncategorized",
        dimensions: dims,
        properties: {
          uuid: m.uuid,
          position: m.position,
          globalId: `GUID-${m.uuid.slice(0, 8).toUpperCase()}`,
        },
      };
    });

    setElements(sampleElements);
    setVisibleCategories(cats);
    setModels(prev => [...prev, "Sample Building"]);
  }, []);

  /* ─── Click Handler (Selection / Measure / Clip) ─── */
  useEffect(() => {
    if (!sceneRef.current || !isInitialized) return;

    const { renderer, camera, raycaster, mouse, meshes, scene, controls } = sceneRef.current;
    const canvas = renderer.domElement;

    const onClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const visibleMeshes = meshes.filter(m => m.visible);
      const intersects = raycaster.intersectObjects(visibleMeshes);

      if (intersects.length === 0) return;
      const hit = intersects[0];
      const obj = hit.object as THREE.Mesh;

      if (toolMode === "measure") {
        /* ── Measure mode ── */
        const pt = hit.point.clone();
        const pts = measurePointsRef.current;
        pts.push(pt);

        /* Add point marker */
        const markerGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(pt);
        scene.add(marker);
        sceneRef.current?.measurements.add(marker);

        if (pts.length === 2) {
          /* Draw line */
          const lineGeo = new THREE.BufferGeometry().setFromPoints([pts[0], pts[1]]);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xff6600, linewidth: 3 });
          const line = new THREE.Line(lineGeo, lineMat);
          scene.add(line);
          sceneRef.current?.measurements.add(line);
          measureLineRef.current = line;

          /* Distance label */
          const dist = pts[0].distanceTo(pts[1]);
          setActiveMeasurements(prev => [...prev, {
            id: Date.now(),
            distance: formatLength(dist),
            from: obj.name,
            to: obj.name,
          }]);

          /* Clear for next measurement */
          measurePointsRef.current = [];
        }
        return;
      }

      if (toolMode === "clip") {
        /* ── Clip mode: create clipping plane at hit face ── */
        const normal = hit.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
        normal.transformDirection(obj.matrixWorld).normalize();

        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point);

        /* Apply to all materials */
        meshes.forEach(m => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (!mat.clippingPlanes) mat.clippingPlanes = [];
          mat.clippingPlanes.push(plane);
          mat.needsUpdate = true;
        });

        /* Visual indicator */
        const planeHelper = new THREE.PlaneHelper(plane, 10, 0xff4444);
        scene.add(planeHelper);
        sceneRef.current?.clipPlanes.add(planeHelper);

        setActiveClipPlanes(prev => [...prev, {
          id: Date.now(),
          name: `Clip: ${obj.name}`,
        }]);

        setToolMode("select");
        return;
      }

      /* ── Select mode ── */
      meshes.forEach(m => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x000000);
      });
      const mat = obj.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x444400);

      const dims = calculateDimensions(obj);
      const bimEl: BIMElement = {
        expressID: obj.id,
        name: obj.name,
        type: obj.userData?.type || "Unknown",
        category: obj.userData?.category || "Unknown",
        dimensions: dims,
        properties: {
          uuid: obj.uuid,
          position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
          globalId: `GUID-${obj.uuid.slice(0, 8).toUpperCase()}`,
          normal: hit.face?.normal,
        },
      };
      setSelectedElement(bimEl);
    };

    const onDoubleClick = (event: MouseEvent) => {
      if (toolMode !== "select") return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const visibleMeshes = meshes.filter(m => m.visible);
      const intersects = raycaster.intersectObjects(visibleMeshes);
      if (intersects.length > 0) {
        const hit = intersects[0].point;
        const offset = camera.position.clone().sub(controls.target);
        controls.target.set(hit.x, hit.y, hit.z);
        camera.position.set(hit.x + offset.x * 0.3, hit.y + offset.y * 0.3, hit.z + offset.z * 0.3);
      }
    };

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDoubleClick);

    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", onDoubleClick);
    };
  }, [isInitialized, toolMode]);

  /* ─── Tools ─── */

  const setMode = useCallback((mode: ToolMode) => {
    setToolMode(mode);
    if (mode === "measure") {
      measurePointsRef.current = [];
    }
  }, []);

  const setNavMode = useCallback((mode: NavMode) => {
    if (!sceneRef.current) return;
    const { controls, camera } = sceneRef.current;
    navModeRef.current = mode;
    setNavModeState(mode);
    if (mode === "firstperson") {
      controls.enabled = false;
      /* Drop to eye height keeping XZ */
      camera.position.y = 1.7;
      /* Init yaw/pitch from current look direction */
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      fpStateRef.current.yaw = Math.atan2(-dir.x, -dir.z);
      fpStateRef.current.pitch = Math.asin(dir.y > 1 ? 1 : dir.y < -1 ? -1 : dir.y);
      fpStateRef.current.dragging = false;
      camera.quaternion.setFromEuler(new THREE.Euler(fpStateRef.current.pitch, fpStateRef.current.yaw, 0, "YXZ"));
    } else {
      controls.enabled = true;
      camera.position.set(20, 16, 20);
      controls.target.set(0, 4, 0);
      controls.update();
    }
  }, []);

  const resetView = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current.camera.position.set(20, 16, 20);
    sceneRef.current.controls.target.set(0, 4, 0);
    sceneRef.current.controls.update();
  }, []);

  const zoomToSelection = useCallback(() => {
    if (!sceneRef.current || !selectedElement) return;
    const { camera, controls, meshes } = sceneRef.current;
    const mesh = meshes.find(m => m.id === selectedElement.expressID);
    if (!mesh) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim / Math.tan((camera.fov * Math.PI / 180) / 2) * 1.5;

    controls.target.copy(center);
    camera.position.set(center.x + dist * 0.5, center.y + dist * 0.4, center.z + dist * 0.5);
    controls.update();
  }, [selectedElement]);

  /* ─── Visibility ─── */

  const hideElement = useCallback((expressID: number) => {
    if (!sceneRef.current) return;
    const mesh = sceneRef.current.meshes.find(m => m.id === expressID);
    if (mesh) {
      mesh.visible = false;
      setHiddenMeshes(prev => new Set([...prev, expressID]));
      setIsolatedMesh(null);
    }
  }, []);

  const showElement = useCallback((expressID: number) => {
    if (!sceneRef.current) return;
    const mesh = sceneRef.current.meshes.find(m => m.id === expressID);
    if (mesh) {
      mesh.visible = true;
      setHiddenMeshes(prev => {
        const next = new Set(prev);
        next.delete(expressID);
        return next;
      });
    }
  }, []);

  const isolateElement = useCallback((expressID: number) => {
    if (!sceneRef.current) return;
    sceneRef.current.meshes.forEach(m => {
      m.visible = m.id === expressID;
    });
    setIsolatedMesh(expressID);
    setHiddenMeshes(new Set());
  }, []);

  const showAll = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current.meshes.forEach(m => {
      m.visible = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x000000);
    });
    setHiddenMeshes(new Set());
    setIsolatedMesh(null);
  }, []);

  /* ─── Filters ─── */

  const filterByCategory = useCallback((categories: string[]) => {
    if (!sceneRef.current) return;
    setCategoryFilter(categories);
    sceneRef.current.meshes.forEach(m => {
      const cat = m.userData?.category || "Uncategorized";
      m.visible = categories.length === 0 || categories.includes(cat);
    });
  }, []);

  /* ─── Screenshot ─── */

  const takeScreenshot = useCallback(() => {
    if (!sceneRef.current) return "";
    const { renderer } = sceneRef.current;
    renderer.render(sceneRef.current.scene, sceneRef.current.camera);
    const dataURL = renderer.domElement.toDataURL("image/png");
    return dataURL;
  }, []);

  /* ─── Clear measurements ─── */

  const clearMeasurements = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current.measurements.clear();
    setActiveMeasurements([]);
    measurePointsRef.current = [];
  }, []);

  /* ─── Clear clip planes ─── */

  const clearClipPlanes = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current.clipPlanes.clear();
    setActiveClipPlanes([]);
    sceneRef.current.meshes.forEach(m => {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.clippingPlanes = [];
      mat.needsUpdate = true;
    });
  }, []);

  /* ─── BCF Issues ─── */

  const addIssue = useCallback((issue: Omit<BIMIssue, "id" | "date" | "comments">) => {
    if (!sceneRef.current) return;
    const { camera, controls } = sceneRef.current;

    /* Capture snapshot */
    const screenshot = takeScreenshot();

    const newIssue: BIMIssue = {
      ...issue,
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      comments: [],
      screenshot,
      viewpoint: {
        cameraPosition: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        cameraTarget: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
        fieldOfView: camera.fov,
      },
    };
    setIssues(prev => [...prev, newIssue]);
  }, [takeScreenshot]);

  const updateIssue = useCallback((id: string, updates: Partial<BIMIssue>) => {
    setIssues(prev => prev.map(issue =>
      issue.id === id ? { ...issue, ...updates } : issue
    ));
  }, []);

  const deleteIssue = useCallback((id: string) => {
    setIssues(prev => prev.filter(issue => issue.id !== id));
  }, []);

  const zoomToIssue = useCallback((issue: BIMIssue) => {
    if (!sceneRef.current || !issue.viewpoint) return;
    const { camera, controls } = sceneRef.current;
    const vp = issue.viewpoint;
    camera.position.set(vp.cameraPosition.x, vp.cameraPosition.y, vp.cameraPosition.z);
    controls.target.set(vp.cameraTarget.x, vp.cameraTarget.y, vp.cameraTarget.z);
    controls.update();
  }, []);

  const selectElement = useCallback((element: BIMElement) => {
    /* Recalculate dimensions from mesh */
    let dims = element.dimensions;
    if (sceneRef.current) {
      const mesh = sceneRef.current.meshes.find(m => m.id === element.expressID || m.name === element.name);
      if (mesh) {
        dims = calculateDimensions(mesh);
      }
      sceneRef.current.meshes.forEach(m => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x000000);
      });
      if (mesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x444400);
      }
    }
    setSelectedElement({ ...element, dimensions: dims });
  }, []);

  const addCommentToIssue = useCallback((issueId: string, comment: { author: string; text: string }) => {
    setIssues(prev => prev.map(issue =>
      issue.id === issueId
        ? { ...issue, comments: [...issue.comments, { ...comment, date: new Date().toISOString().split("T")[0] }] }
        : issue
    ));
  }, []);

  /* ─── IFC Load — web-ifc direct parser ─── */

  const loadIfc = useCallback(async (file: File) => {
    const sd = sceneRef.current;
    if (!sd) return;
    setIsLoading(true);
    setLoadingProgress(5);

    try {
      /* Lazy-load web-ifc with WASM from CDN */
      const WI = await import("web-ifc");
      const api = new WI.IfcAPI();
      api.SetWasmPath("https://unpkg.com/web-ifc@0.0.77/");
      await api.Init();
      setLoadingProgress(12);

      const buffer = new Uint8Array(await file.arrayBuffer());
      setLoadingProgress(18);

      const modelID = api.OpenModel(buffer, {
        COORDINATE_TO_ORIGIN: true,
      });
      setLoadingProgress(25);

      /* Category labels by IFC type code */
      const CAT: Record<number, string> = {
        [WI.IFCWALL]: "Muro", [WI.IFCWALLSTANDARDCASE]: "Muro",
        [WI.IFCSLAB]: "Losa", [WI.IFCSLABSTANDARDCASE]: "Losa",
        [WI.IFCBEAM]: "Viga", [WI.IFCBEAMSTANDARDCASE]: "Viga",
        [WI.IFCCOLUMN]: "Columna", [WI.IFCCOLUMNSTANDARDCASE]: "Columna",
        [WI.IFCDOOR]: "Puerta", [WI.IFCDOORSTANDARDCASE]: "Puerta",
        [WI.IFCWINDOW]: "Ventana", [WI.IFCWINDOWSTANDARDCASE]: "Ventana",
        [WI.IFCSTAIR]: "Escalera", [WI.IFCROOF]: "Cubierta",
        [WI.IFCRAILING]: "Barandilla", [WI.IFCCOVERING]: "Revestimiento",
        [WI.IFCMEMBER]: "Perfil", [WI.IFCMEMBERSTANDARDCASE]: "Perfil",
        [WI.IFCPLATE]: "Placa", [WI.IFCPLATESTANDARDCASE]: "Placa",
        [WI.IFCFLOWFITTING]: "Instalación - Fitting",
        [WI.IFCFLOWSEGMENT]: "Instalación - Segmento",
        [WI.IFCFLOWTERMINAL]: "Instalación - Terminal",
        [WI.IFCFURNISHINGELEMENT]: "Mobiliario",
        [WI.IFCBUILDINGELEMENTPROXY]: "Elemento Genérico",
        [WI.IFCSPACE]: "Espacio",
        [WI.IFCOPENINGELEMENT]: "Apertura",
      };

      /* Group all geometry under one Three.js node */
      const modelGroup = new THREE.Group();
      modelGroup.name = file.name;
      sd.scene.add(modelGroup);

      /* Stream geometry from IFC — main parse loop */
      let meshCount = 0;
      api.StreamAllMeshes(modelID, (flatMesh) => {
        const geoms = flatMesh.geometries;
        for (let i = 0; i < geoms.size(); i++) {
          const g   = geoms.get(i);
          const raw = api.GetGeometry(modelID, g.geometryExpressID);
          const verts = api.GetVertexArray(raw.GetVertexDataSize(), raw.GetVertexData());
          const idxs  = api.GetIndexArray(raw.GetIndexDataSize(), raw.GetIndexData());

          /* Interleaved: [x,y,z, nx,ny,nz, …] */
          const nv = verts.length / 6;
          const pos  = new Float32Array(nv * 3);
          const norm = new Float32Array(nv * 3);
          for (let j = 0; j < nv; j++) {
            pos[j*3]   = verts[j*6];   pos[j*3+1] = verts[j*6+1]; pos[j*3+2] = verts[j*6+2];
            norm[j*3]  = verts[j*6+3]; norm[j*3+1]= verts[j*6+4]; norm[j*3+2]= verts[j*6+5];
          }

          const bufGeom = new THREE.BufferGeometry();
          bufGeom.setAttribute("position", new THREE.BufferAttribute(pos,  3));
          bufGeom.setAttribute("normal",   new THREE.BufferAttribute(norm, 3));
          bufGeom.setIndex(new THREE.BufferAttribute(idxs, 1));

          const c   = g.color;
          const mat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(c.x, c.y, c.z),
            opacity: c.w, transparent: c.w < 0.99,
            side: THREE.DoubleSide,
          });

          const mesh = new THREE.Mesh(bufGeom, mat);
          mesh.userData.expressID = flatMesh.expressID;
          mesh.applyMatrix4(new THREE.Matrix4().fromArray(g.flatTransformation));
          modelGroup.add(mesh);
          sd.meshes.push(mesh);
          raw.delete();
        }
        if (++meshCount % 200 === 0) {
          setLoadingProgress(Math.min(88, 25 + Math.round(meshCount / 40)));
        }
      });
      setLoadingProgress(90);

      /* Extract element metadata for Model Browser */
      const newElements: BIMElement[] = [];
      const productTypeIds = [
        WI.IFCWALL, WI.IFCWALLSTANDARDCASE, WI.IFCSLAB, WI.IFCSLABSTANDARDCASE,
        WI.IFCBEAM, WI.IFCBEAMSTANDARDCASE, WI.IFCCOLUMN, WI.IFCCOLUMNSTANDARDCASE,
        WI.IFCDOOR, WI.IFCDOORSTANDARDCASE, WI.IFCWINDOW, WI.IFCWINDOWSTANDARDCASE,
        WI.IFCSTAIR, WI.IFCROOF, WI.IFCRAILING, WI.IFCCOVERING,
        WI.IFCMEMBER, WI.IFCMEMBERSTANDARDCASE, WI.IFCPLATE, WI.IFCPLATESTANDARDCASE,
        WI.IFCFLOWFITTING, WI.IFCFLOWSEGMENT, WI.IFCFLOWTERMINAL,
        WI.IFCFURNISHINGELEMENT, WI.IFCBUILDINGELEMENTPROXY,
      ];

      for (const typeId of productTypeIds) {
        try {
          const lines = api.GetLineIDsWithType(modelID, typeId);
          for (let i = 0; i < lines.size(); i++) {
            const expressID = lines.get(i);
            let name = `${CAT[typeId] ?? "Elemento"} ${expressID}`;
            const properties: Record<string, string> = {};
            try {
              const line = api.GetLine(modelID, expressID, false);
              if (line?.Name?.value) name = String(line.Name.value);
            } catch { /* skip */ }
            try {
              const full = api.GetLine(modelID, expressID, true);
              if (full?.IsDefinedBy) {
                for (const rel of full.IsDefinedBy) {
                  const pset = rel?.RelatingPropertyDefinition;
                  if (!pset?.HasProperties) continue;
                  for (const prop of pset.HasProperties) {
                    if (prop?.Name?.value && prop?.NominalValue?.value !== undefined) {
                      properties[String(prop.Name.value)] = String(prop.NominalValue.value);
                    }
                  }
                }
              }
            } catch { /* skip */ }
            newElements.push({
              expressID, name,
              type: CAT[typeId] ?? "Elemento",
              category: CAT[typeId] ?? "Elemento",
              dimensions: { length: 0, width: 0, height: 0, area: 0, volume: 0 },
              properties,
            });
          }
        } catch { /* skip type */ }
      }

      api.CloseModel(modelID);
      setLoadingProgress(96);

      /* Fit camera to bounding box */
      const box = new THREE.Box3().setFromObject(modelGroup);
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const d = Math.max(size.x, size.y, size.z);
        sd.camera.position.set(center.x + d * 1.5, center.y + d, center.z + d * 1.5);
        sd.controls.target.copy(center);
        sd.controls.update();
      }

      setModels(prev => [...prev, file.name]);
      setElements(prev => [...prev, ...newElements]);
      setLoadingProgress(100);

    } catch (e) {
      console.error("IFC load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ─── Derived categories list ─── */
  const categories = Array.from(new Set(elements.map(e => e.category)));

  return {
    isInitialized,
    isLoading,
    loadingProgress,
    selectedElement,
    elements,
    issues,
    models,
    categories,
    toolMode,
    activeMeasurements,
    activeClipPlanes,
    hiddenMeshes,
    isolatedMesh,
    categoryFilter,
    /* Actions */
    navMode,
    setNavMode,
    loadIfc,
    loadSampleModel,
    setMode,
    resetView,
    zoomToSelection,
    hideElement,
    showElement,
    isolateElement,
    showAll,
    filterByCategory,
    takeScreenshot,
    clearMeasurements,
    clearClipPlanes,
    addIssue,
    updateIssue,
    deleteIssue,
    zoomToIssue,
    addCommentToIssue,
    selectElement,
  };
}
