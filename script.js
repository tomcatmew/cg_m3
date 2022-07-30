// Yifei Chen CG M3 Assignment 2022 Fall, University of Tokyo

var container, scene, camera, renderer, controls, stats;
var meshTarget;

const params = {
  cubeSize: 10,
  meshShape: "sphere",
};

init();
animate();

function init() {
  container = document.getElementById("maincanvas");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    20000
  );
  scene.add(camera);
  camera.position.set(20, 20, 60);
  camera.lookAt(scene.position);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.style.margin = 0;
  document.body.style.padding = 0;
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.left = "225px";
  stats.domElement.style.top = "150px";
  container.appendChild(stats.domElement);

  var light = new THREE.PointLight(0xffffff);
  light.position.set(0, 1000, 0);
  var amblight = new THREE.AmbientLight(0x000000);
  scene.add(light);
  scene.add(amblight);

  scene.add(new THREE.AxisHelper(25));

  const gui = new dat.GUI();
  gui.domElement.id = "gui";
  const cubeFolder = gui.addFolder("Marching Cube Parameters");
  cubeFolder
    .add(params, "meshShape", ["sphere", "hyperboloid", "ellipsoid"])
    .name("Select Shape")
    .onChange(updateMarchSphere);
  cubeFolder.add(params, "cubeSize", 4, 50).step(1).onChange(updateMarchSphere);
  cubeFolder.open();
  updateMarchSphere();
}


//-----------------------------------------------------
// This is the marching cube algorithm implementation
//-----------------------------------------------------

function updateMarchSphere() {
  var cubeSize = params.cubeSize;
  if (scene.getObjectByName("marchingCube")) scene.remove(meshTarget);
  var values = [];
  // points inside the bounding box
  var Ps = [];

  // bounding box
  var sampleMin = -20;
  var sampleMax = 20;
  var sampleRange = sampleMax - sampleMin;

  for (var k = 0; k < cubeSize; k++)
    for (var j = 0; j < cubeSize; j++)
      for (var i = 0; i < cubeSize; i++) {
        var x = sampleMin + (sampleRange * i) / (cubeSize - 1);
        var y = sampleMin + (sampleRange * j) / (cubeSize - 1);
        var z = sampleMin + (sampleRange * k) / (cubeSize - 1);
        Ps.push(new THREE.Vector3(x, y, z));

        // 3D surface implicit functions
        var v;
        if (params.meshShape == "sphere") v = x * x + y * y + z * z - 100;
        else if (params.meshShape == "hyperboloid")
          v = (x * x) / 5 + (y * y) / 5 - (z * z) / 10;
        else if (params.meshShape == "ellipsoid")
          v = (x * x) / 5 + (y * y) / 5 + (z * z) / 10 - 15;
        values.push(v);
      }

  var sizeSquare = cubeSize * cubeSize;

  // 12 bit representation
  var vlist = new Array(12);

  var geometry = new THREE.Geometry();
  var vertexIndex = 0;

  for (var z = 0; z < cubeSize - 1; z++)
    for (var y = 0; y < cubeSize - 1; y++)
      for (var x = 0; x < cubeSize - 1; x++) {
        var p = x + cubeSize * y + sizeSquare * z,
          px = p + 1,
          py = p + cubeSize,
          pxy = py + 1,
          pz = p + sizeSquare,
          pxz = px + sizeSquare,
          pyz = py + sizeSquare,
          pxyz = pxy + sizeSquare;

        var value0 = values[p],
          value1 = values[px],
          value2 = values[py],
          value3 = values[pxy],
          value4 = values[pz],
          value5 = values[pxz],
          value6 = values[pyz],
          value7 = values[pxyz];

        // Binary Representation of the triangle inside of the cube //立方体の中にある三角形の binary 表現
        var isolate = 0;

        var cubeindex = 0;

        // applying bitwise switch here
        // refer to original paper
        if (value0 < isolate) cubeindex |= 1;
        if (value1 < isolate) cubeindex |= 2;
        if (value2 < isolate) cubeindex |= 8;
        if (value3 < isolate) cubeindex |= 4;
        if (value4 < isolate) cubeindex |= 16;
        if (value5 < isolate) cubeindex |= 32;
        if (value6 < isolate) cubeindex |= 128;
        if (value7 < isolate) cubeindex |= 64;

        // 12 bits binary representation indicates which edges are crossed by the isosurface
        var bits = THREE.edgeTable[cubeindex];

        // if there is no point cross, skip
        if (bits === 0) continue;

        // どの辺が交差しているか確認する
        var diff = 0.5;

        // bot part 
        if (bits & 1) {
          diff = (isolate - value0) / (value1 - value0);
          vlist[0] = Ps[p].clone().lerp(Ps[px], diff);
        }
        if (bits & 2) {
          diff = (isolate - value1) / (value3 - value1);
          vlist[1] = Ps[px].clone().lerp(Ps[pxy], diff);
        }
        if (bits & 4) {
          diff = (isolate - value2) / (value3 - value2);
          vlist[2] = Ps[py].clone().lerp(Ps[pxy], diff);
        }
        if (bits & 8) {
          diff = (isolate - value0) / (value2 - value0);
          vlist[3] = Ps[p].clone().lerp(Ps[py], diff);
        }
        // top part 
        if (bits & 16) {
          diff = (isolate - value4) / (value5 - value4);
          vlist[4] = Ps[pz].clone().lerp(Ps[pxz], diff);
        }
        if (bits & 32) {
          diff = (isolate - value5) / (value7 - value5);
          vlist[5] = Ps[pxz].clone().lerp(Ps[pxyz], diff);
        }
        if (bits & 64) {
          diff = (isolate - value6) / (value7 - value6);
          vlist[6] = Ps[pyz].clone().lerp(Ps[pxyz], diff);
        }
        if (bits & 128) {
          diff = (isolate - value4) / (value6 - value4);
          vlist[7] = Ps[pz].clone().lerp(Ps[pyz], diff);
        }
        // vertical part of each eage 
        if (bits & 256) {
          diff = (isolate - value0) / (value4 - value0);
          vlist[8] = Ps[p].clone().lerp(Ps[pz], diff);
        }
        if (bits & 512) {
          diff = (isolate - value1) / (value5 - value1);
          vlist[9] = Ps[px].clone().lerp(Ps[pxz], diff);
        }
        if (bits & 1024) {
          diff = (isolate - value3) / (value7 - value3);
          vlist[10] = Ps[pxy].clone().lerp(Ps[pxyz], diff);
        }
        if (bits & 2048) {
          diff = (isolate - value2) / (value6 - value2);
          vlist[11] = Ps[py].clone().lerp(Ps[pyz], diff);
        }

        // find vertices from triangle look up table
        var i = 0;
        cubeindex = cubeindex * 16;

        while (THREE.triangleTable[cubeindex + i] != -1) {
          var index1 = THREE.triangleTable[cubeindex + i];
          var index2 = THREE.triangleTable[cubeindex + i + 1];
          var index3 = THREE.triangleTable[cubeindex + i + 2];

          geometry.vertices.push(vlist[index1].clone());
          geometry.vertices.push(vlist[index2].clone());
          geometry.vertices.push(vlist[index3].clone());
          var face = new THREE.Face3(
            vertexIndex,
            vertexIndex + 1,
            vertexIndex + 2
          );
          geometry.faces.push(face);

          geometry.faceVertexUvs[0].push([
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0, 1),
            new THREE.Vector2(1, 1),
          ]);

          vertexIndex += 3;
          i += 3;
        }
      }

  // compute the geo information by using three js api

  geometry.computeCentroids();
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();

  var colorMaterial = new THREE.MeshPhongMaterial({
    color: 0xf1d287,
    side: THREE.DoubleSide,
    emissive: 0x563838,
    specular: 0xd6d6d6,
    shininess: 80,
  });
  meshTarget = new THREE.Mesh(geometry, colorMaterial);
  meshTarget.name = "marchingCube";
  scene.add(meshTarget);
}

// default update and animate funcs
function animate() {
  requestAnimationFrame(animate);
  render();
  update();
}

function update() {
  controls.update();
  stats.update();
}

function render() {
  renderer.render(scene, camera);
}
