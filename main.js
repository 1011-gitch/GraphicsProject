import * as THREE from "https://unpkg.com/three@0.119.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.119.0/examples/jsm/loaders/GLTFLoader";

//"/three/examples/jsm/loaders/GLTFLoader";

//import "./Font/docs/@fontsource/press-start-2p";

//require("./main.css");

// Constants.
console.warn("working here!!!");

const TREX_JUMP_SPEED = 20;

const CACTUS_SPAWN_X = 20;
const CACTUS_DESTROY_X = -20;
const CACTUS_MAX_SCALE = 1;
const CACTUS_MIN_SCALE = 0.5;
const CACTUS_SPAWN_MAX_INTERVAL = 5;
const CACTUS_SPAWN_MIN_INTERVAL = 2;

const PTERODACTYL_MIN_Y = 4;
const PTERODACTYL_MAX_Y = 5;
const PTERODACTYL_SPAWN_X = -5;
const PTERODACTYL_SPAWN_INTERVAL = 10;
const PTERODACTYL_SPEED = 2;

const GRAVITY = -50;
const FLOOR_SPEED = -10;
const SKYSPHERE_ROTATE_SPEED = 0.02;
const SCORE_INCREASE_SPEED = 10;

// Global variables.
const scene = new THREE.Scene();
let infoElement;
let YourScore = document.querySelector(".score-area");
let HighScore = document.querySelector(".high-score-area");
const Gameover = document.querySelector(".GameOver");
const Gamewin = document.querySelector(".Gamewin");
const clock = new THREE.Clock();
const mixers = [];
let trex;
let cactus;
let floor;
let pterodactyl;
let skySphere;
let directionalLight;
let jump = false;
let vel = 0;
let nextCactusSpawnTime = 0;
let nextPterodactylResetTime = 0;
let score = 0;
let isGameOver = true;
const cactusGroup = new THREE.Group();
scene.add(cactusGroup);
let renderer;
let camera;

function changeBackgroundImage() {
  document.body.style.backgroundImage = "url('trex-1.jpg')";
  document.body.style.backgroundRepeat = "no-repeat";
  document.body.style.backgroundSize = "cover";
}
window.addEventListener("load", function () {
  changeBackgroundImage();
});

const get_High_score = localStorage.getItem("HighScore");
HighScore.innerHTML = "High-Score-" + get_High_score;
function createInfoElement() {
  infoElement = document.createElement("div");
  infoElement.id = "info";
  YourScore.innerHTML = `Your Score-${score}`;
  document.body.appendChild(infoElement);
}
createInfoElement();

function createCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1, 10);
  camera.lookAt(3, 3, 0);
}
createCamera();

function createRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth - "200px", window.innerHeight - "200px");
  renderer.setClearColor(0x7f7f7f);
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.appendChild(renderer.domElement);
}
createRenderer();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  update(delta);

  renderer.render(scene, camera);
}
animate();

function createLighting() {
  directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.intensity = 2;
  directionalLight.position.set(0, 10, 0);

  const targetObject = new THREE.Object3D();
  targetObject.position.set(0, 0, 0);
  scene.add(targetObject);
  directionalLight.target = targetObject;

  scene.add(directionalLight);

  const light = new THREE.AmbientLight(0x7f7f7f); // soft white light
  light.intensity = 1;
  scene.add(light);
}
createLighting();

function load3DModels() {
  // Instantiate a loader.
  const loader = new GLTFLoader();

  // Load T-Rex model.
  loader.load(
    "t-rex/scene.gltf",
    function (gltf) {
      trex = gltf.scene;

      trex.scale.setScalar(0.5);
      trex.rotation.y = Math.PI / 2;

      scene.add(trex);

      const mixer = new THREE.AnimationMixer(trex);
      const clip = THREE.AnimationClip.findByName(gltf.animations, "run");
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
      }
      mixers.push(mixer);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.log("An error happened");
    }
  );

  // Load pterodactyl (flying dinosaur) model.
  loader.load("pterodactyl/scene.gltf", function (gltf) {
    pterodactyl = gltf.scene;

    pterodactyl.rotation.y = Math.PI / 2;
    pterodactyl.scale.multiplyScalar(4);

    //respawnPterodactyl();

    //respawnPterodactyl();

    scene.add(pterodactyl);
    /* 
    const ptclone = pterodactyl.clone();
    
    ptclone.rotation.y=Math.Pi/5;
    ptclone.scale.multiplyScalar(4);
    
    scene.add(ptclone);
    
    */
    respawnPterodactyl();

    const mixer = new THREE.AnimationMixer(pterodactyl);
    const clip = THREE.AnimationClip.findByName(gltf.animations, "flying");
    const action = mixer.clipAction(clip);
    action.play();
    mixers.push(mixer);
    /*
    const mixer1 = new THREE.AnimationMixer(ptclone);
    const clip1 = THREE.AnimationClip.findByName(gltf.animations, "flying");
    const action1 = mixer1.clipAction(clip1);
    action1.play();
    mixers.push(mixer1);*/
  });

  loader.load(
    "cactus/scene.gltf",
    function (gltf) {
      gltf.scene.scale.setScalar(0.05);
      gltf.scene.rotation.y = -Math.PI / 2;

      cactus = gltf.scene;
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.log("An error happened");
    }
  );
}
load3DModels();

function createFloor() {
  const geometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
  const texture = THREE.ImageUtils.loadTexture("sand1.jpg");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(100, 100);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xc4733b,
  });

  floor = new THREE.Mesh(geometry, material);
  floor.material.side = THREE.DoubleSide;
  floor.rotation.x = -Math.PI / 2;

  floor.castShadow = false;
  floor.receiveShadow = true;

  scene.add(floor);
}
createFloor();

function createSkySphere(file) {
  const geometry = new THREE.SphereGeometry(500, 60, 40);

  geometry.scale(-1, 1, 1);

  const texture = new THREE.TextureLoader().load(file);
  texture.encoding = THREE.sRGBEncoding;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  skySphere = new THREE.Mesh(geometry, material);

  scene.add(skySphere);
}
createSkySphere("desert.jpg");

function enableShadow(renderer, light) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  light.castShadow = true;

  //Set up shadow properties for the light
  light.shadow.mapSize.width = 512;
  light.shadow.mapSize.height = 512;
  light.shadow.camera.near = 0.001;
  light.shadow.camera.far = 500;
}
enableShadow(renderer, directionalLight);

function handleInput() {
  Gameover.style.display = "none";
  Gamewin.style.display = "none";
  const callback = () => {
    if (!isGameOver) {
      Gameover.style.display = "none";
      Gamewin.style.display = "none";
      jump = true;
    } else {
      setTimeout(() => {
        restartGame();
      }, 500);
      //jump=true;
      return;
    }
  };

  document.addEventListener(
    "keypress",
    (event) => {
      if (event.code === "Space") {
        callback();
      }
    },
    false
  );
  renderer.domElement.addEventListener("touchstart", callback);
  renderer.domElement.addEventListener("click", callback);
}
handleInput();

function handleWindowResize() {
  window.addEventListener(
    "keypress",
    (event) => {
      if (event.code === "Space") {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    },
    true
  );
}
handleWindowResize();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function gameOver() {
  isGameOver = true;
  const high_score = Math.floor(score).toString().padStart(5, "0");
  const get_score = localStorage.getItem("HighScore");

  Gameover.style.display = "block";
  if (high_score > get_score) {
    localStorage.setItem("HighScore", high_score);
    Gameover.style.display = "none";
    Gamewin.style.backgroundColor = "green";
    Gamewin.style.display = "block";
  }
  YourScore.innerHTML = `Your Score-${high_score}`;
}

function restartGame() {
  isGameOver = false;
  score = 0;
  Gameover.style.display = "none";
  Gamewin.style.display = "none";
  respawnPterodactyl();

  cactusGroup.children.length = 0;
}

function respawnPterodactyl() {
  nextPterodactylResetTime = clock.elapsedTime + PTERODACTYL_SPAWN_INTERVAL;
  pterodactyl.position.x = PTERODACTYL_SPAWN_X;
  pterodactyl.position.y = randomFloat(PTERODACTYL_MIN_Y, PTERODACTYL_MAX_Y);
}

function update(delta) {
  if (!cactus) return;
  if (!trex) return;
  if (!floor) return;
  if (!pterodactyl) return;
  if (isGameOver) return;

  for (const mixer of mixers) {
    mixer.update(delta);
  }

  // T-rex jump.
  if (jump) {
    jump = false;

    // Start jumpping only when T-rex is on the ground.
    if (trex.position.y == 0) {
      vel = TREX_JUMP_SPEED;
      trex.position.y = vel * delta;
    }
  }

  if (trex.position.y > 0) {
    vel += GRAVITY * delta;
    trex.position.y += vel * delta;
  } else {
    trex.position.y = 0;
  }

  // Spawn new cacti.
  if (clock.elapsedTime > nextCactusSpawnTime) {
    const interval = randomFloat(
      CACTUS_SPAWN_MIN_INTERVAL,
      CACTUS_SPAWN_MAX_INTERVAL
    );

    nextCactusSpawnTime = clock.elapsedTime + interval;

    const numCactus = randomInt(3, 5);
    for (let i = 0; i < numCactus; i++) {
      const clone = cactus.clone();
      clone.position.x = CACTUS_SPAWN_X + i * 0.5;
      clone.scale.multiplyScalar(
        randomFloat(CACTUS_MIN_SCALE, CACTUS_MAX_SCALE)
      );

      cactusGroup.add(clone);
    }
  }

  // Move cacti.
  for (const cactus of cactusGroup.children) {
    cactus.position.x += FLOOR_SPEED * delta;
  }

  // Remove out-of-the-screen cacti.
  while (
    cactusGroup.children.length > 0 &&
    cactusGroup.children[0].position.x < CACTUS_DESTROY_X // out of the screen
  ) {
    cactusGroup.remove(cactusGroup.children[0]);
  }

  // Check collision.
  const trexAABB = new THREE.Box3(
    new THREE.Vector3(-1, trex.position.y, 0),
    new THREE.Vector3(1, trex.position.y + 1, 0)
  );

  for (const cactus of cactusGroup.children) {
    const cactusAABB = new THREE.Box3();
    cactusAABB.setFromObject(cactus);

    if (cactusAABB.intersectsBox(trexAABB)) {
      gameOver();
      return;
    }
  }

  // Update texture offset to simulate floor moving.
  floor.material.map.offset.add(new THREE.Vector2(delta, 0));

  trex.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = false;
  });

  if (skySphere) {
    skySphere.rotation.y += delta * SKYSPHERE_ROTATE_SPEED;
  }

  if (clock.elapsedTime > nextPterodactylResetTime) {
    respawnPterodactyl();
  } else {
    pterodactyl.position.x += delta * PTERODACTYL_SPEED;
  }

  score += delta * SCORE_INCREASE_SPEED;
  const get_High_score = localStorage.getItem("HighScore");
  YourScore.innerHTML =
    "Your-Score-" + Math.floor(score).toString().padStart(5, "0");
  HighScore.innerHTML = "High-Score-" + get_High_score;
}
