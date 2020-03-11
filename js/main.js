"use strict";

// Shader code

const vertexShaderSource = `
attribute vec4 a_position;
attribute vec3 a_normal;

uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;

varying vec3 v_normal;
varying vec3 v_position;

void main() {
    // send colour to fragment shader (interpolated)
    v_normal = u_normalMatrix * a_normal;
    vec4 v_postion = a_position * u_worldMatrix;
    gl_Position = u_projectionMatrix *u_viewMatrix * u_worldMatrix * a_position;
}
`;

// 3c) Set fragment colour to interpolated v_colour

const fragmentShaderSource = `
precision mediump float;
varying vec3 v_normal;
varying vec3 v_position;

uniform vec3 u_ambientIntensity;
uniform vec3 u_diffuseMaterial;

uniform vec3 u_lightIntensity;
uniform vec3 u_lightPosition;

void main() {
    vec3 n = normalize(v_normal);
    vec3 s = (u_lightPosition - v_position).xyz;
    s = normalize(s);

    vec3 ambient = u_ambientIntensity * u_diffuseMaterial;
    vec3 diffuse = u_lightIntensity * u_diffuseMaterial * max(0.0, dot(n, s));
    
    // set colour
    gl_FragColor = vec4(diffuse, 1); 
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function resize(canvas) {
  const resolution = window.devicePixelRatio || 1.0;

  const displayWidth = Math.floor(canvas.clientWidth * resolution);
  const displayHeight = Math.floor(canvas.clientHeight * resolution);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    return true;
  } else {
    return false;
  }
}

function run(level) {
  // === Initialisation ===

  // Get the canvas element & gl rendering context
  const canvas = document.getElementById("c");
  const gl = canvas.getContext("webgl");
  if (gl === null) {
    window.alert("WebGL not supported!");
    return;
  }

  // 1) Enable depth testing and back-face culling
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  // Compile the shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );
  const program = createProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(program);

  // Initialise the shader attributes & uniforms
  const shader = {
    program: program
  };

  const nAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < nAttributes; i++) {
    const name = gl.getActiveAttrib(program, i).name;
    shader[name] = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(shader[name]);
  }

  const nUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nUniforms; i++) {
    const name = gl.getActiveUniform(program, i).name;
    shader[name] = gl.getUniformLocation(program, name);
  }

  //construct the objects
  const width = level.heightmap.width;
  const depth = level.heightmap.depth;
  let height = 0;

  let colours = [];
  let points = [];

  //calculate points for heightmap as two triangles per each square
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      let y = level.heightmap.height[x + z * width];
      let y1 = level.heightmap.height[x + z * width + width + 1];
      let y2 = level.heightmap.height[x + z * width + 1];
      let y3 = level.heightmap.height[x + z * width + width];

      if (
        y == undefined ||
        y1 == undefined ||
        y2 == undefined ||
        y3 == undefined
      ) {
        y = 0;
        y1 = 0;
        y2 = 0;
        y3 = 0;
      }

      points.push(x, y, z);
      points.push(x + 1, y1, z + 1);
      points.push(x + 1, y2, z);

      points.push(x, y, z);
      points.push(x, y3, z + 1);
      points.push(x + 1, y1, z + 1);
    }
  }

  let plane = new Plane(gl, points);

  let trees = [];

  let camera = false;

  //calculate coordinates for each tree using JSON
  for (let i = 0; i < level.trees.length; i++) {
    trees.push(new Tree(gl));

    let top =
      level.heightmap.height[level.trees[i][0] + level.trees[i][1] * width];
    let bottom =
      level.heightmap.height[level.trees[i][0] + level.trees[i][1] * width];
    let left =
      level.heightmap.height[level.trees[i][0] + level.trees[i][1] * width];
    let right =
      level.heightmap.height[level.trees[i][0] + level.trees[i][1] * width];

    if (level.trees[i][0] + level.trees[i][1] * width - width >= 0) {
      top =
        level.heightmap.height[
          level.trees[i][0] + level.trees[i][1] * width - width
        ];
    }
    if (
      level.trees[i][0] + level.trees[i][1] * width + width <=
      level.heightmap.height.length - 1
    ) {
      bottom =
        level.heightmap.height[
          level.trees[i][0] + level.trees[i][1] * width + width
        ];
    }
    if (level.trees[i][0] + level.trees[i][1] * width - 1 >= 0) {
      left =
        level.heightmap.height[
          level.trees[i][0] + level.trees[i][1] * width - 1
        ];
    }
    if (
      level.trees[i][0] + level.trees[i][1] * width + 1 <=
      level.heightmap.height.length - 1
    ) {
      right =
        level.heightmap.height[
          level.trees[i][0] + level.trees[i][1] * width + 1
        ];
    }

    height =
      level.heightmap.height[level.trees[i][0] + level.trees[i][1] * width];

    //if vertex height of tree position is higher than surrounding vertices, calculate height using
    //linear interpolation
    if (height > top) {
      height = height + trees[i].trunkScale[0] * (top - height);
    }
    if (height > bottom) {
      height = height + trees[i].trunkScale[0] * (bottom - height);
    }
    if (height > left) {
      height = height + trees[i].trunkScale[0] * (left - height);
    }
    if (height > right) {
      height = height + trees[i].trunkScale[0] * (right - height);
    }

    trees[i].position = [level.trees[i][0], height, level.trees[i][1]];
    trees[i].branchPosition = [
      level.trees[i][0],
      height + 3,
      level.trees[i][1]
    ];
  }

  let player = new Player(gl);

  player.position[0] = level.player.position[0];

  player.position[2] = level.player.position[1];

  // === Per Frame Operations

  // animation loop
  let oldTime = 0;
  let animate = function(time) {
    time = time / 1000;
    let deltaTime = time - oldTime;
    oldTime = time;

    resize(canvas);
    update(deltaTime);
    render();

    requestAnimationFrame(animate);
  };

  let field = 60;
  let cameraDistance = 0;
  const cameraZoomSpeed = 1; // distance per second
  const cameraRotation = [0, 0, 0];
  cameraRotation[1] = level.player.heading[1];
  const fps = [0, 0, 0];
  let cameraPosition = [1, 1, 1];

  // update objects in the scene
  let update = function(deltaTime) {
    let screen = document.getElementById("c");
    let clickBound = [
      screen.width / 3,
      screen.height / 3,
      (screen.width / 3) * 2,
      (screen.height / 3) * 2,
      (screen.width / 3) * 2,
      screen.height / 3,
      screen.width / 3,
      (screen.height / 3) * 2
    ];

    check(isNumber(deltaTime));

    //calculate current height of player between vertices using barycentric coordinates
    for (let i = 0; i < points.length; i = i + 18) {
      if (
        player.position[0] >= points[i] &&
        player.position[0] <= points[i + 6] &&
        player.position[2] >= points[i + 2] &&
        player.position[2] <= points[i + 14]
      ) {
        let sign =
          (points[i + 3] - points[i]) * (player.position[2] - points[i + 2]) -
          (points[i + 5] - points[i + 2]) * (player.position[0] - points[i]);
        if (sign <= 0) {
          let b00 =
            width -
            (width - points[i + 6] + player.position[0]) /
              (width - (points[i] + (width - points[i + 6])));
          let b01 =
            (player.position[2] - points[i + 2]) /
            (depth - (points[i + 2] + (depth - points[i + 5])));
          let b02 = 1 - b00 - b01;
          player.position[1] =
            b00 * points[i + 1] + b01 * points[i + 4] + b02 * points[i + 7];
        } else if (sign >= 0) {
          let b0 =
            (player.position[0] - points[i + 12]) /
            (width - (points[i + 12] + (width - points[i + 15])));
          let b1 =
            depth -
            (depth - points[i + 14] + player.position[2]) /
              (depth - (points[i + 11] + (depth - points[i + 14])));
          let b2 = 1 - b0 - b1;
          player.position[1] =
            b0 * points[i + 16] + b1 * points[i + 10] + b2 * points[i + 13];
        }
      }
    }

    if (inputManager.keyPressed["KeyA"]) {
      //if in third-person view, and player is in heightmap area, change player position
      //using camera direction
      if (camera == true) {
        if (
          player.position[0] -
            player.trunkScale[0] -
            Math.sin(cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[0] +
            player.trunkScale[0] -
            Math.sin(cameraRotation[1]) * 2 * deltaTime <=
            width
        ) {
          player.position[0] -= Math.sin(cameraRotation[1]) * 2 * deltaTime;
        }
        if (
          player.position[2] -
            player.trunkScale[2] -
            Math.cos(cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[2] +
            player.trunkScale[2] -
            Math.cos(cameraRotation[1]) * 2 * deltaTime <=
            depth
        ) {
          player.position[2] -= Math.cos(cameraRotation[1]) * 2 * deltaTime;
        }
        //if in third-person view, and player is in heightmap area, change player position
        //using camera direction
      } else if (camera == false) {
        if (
          player.position[0] -
            player.trunkScale[0] -
            Math.sin(-cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[0] +
            player.trunkScale[0] -
            Math.sin(-cameraRotation[1]) * 2 * deltaTime <=
            width
        ) {
          player.position[0] -= Math.sin(-cameraRotation[1]) * 2 * deltaTime;
        }
        if (
          player.position[2] -
            player.trunkScale[2] -
            Math.cos(-cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[2] +
            player.trunkScale[2] -
            Math.cos(-cameraRotation[1]) * 2 * deltaTime <=
            depth
        ) {
          player.position[2] -= Math.cos(-cameraRotation[1]) * 2 * deltaTime;
        }
      }
    }
    if (inputManager.keyPressed["KeyD"]) {
      if (camera == true) {
        if (
          player.position[0] -
            player.trunkScale[0] +
            Math.sin(cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[0] +
            player.trunkScale[0] +
            Math.sin(cameraRotation[1]) * 2 * deltaTime <=
            width
        ) {
          player.position[0] += Math.sin(cameraRotation[1]) * 2 * deltaTime;
        }
        if (
          player.position[2] -
            player.trunkScale[2] +
            Math.cos(cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[2] +
            player.trunkScale[2] +
            Math.cos(cameraRotation[1]) * 2 * deltaTime <=
            depth
        ) {
          player.position[2] += Math.cos(cameraRotation[1]) * 2 * deltaTime;
        }
      } else if (camera == false) {
        if (
          player.position[0] -
            player.trunkScale[0] +
            Math.sin(-cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[0] +
            player.trunkScale[0] +
            Math.sin(-cameraRotation[1]) * 2 * deltaTime <=
            width
        ) {
          player.position[0] += Math.sin(-cameraRotation[1]) * 2 * deltaTime;
        }
        if (
          player.position[2] -
            player.trunkScale[2] +
            Math.cos(-cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[2] +
            player.trunkScale[2] +
            Math.cos(-cameraRotation[1]) * 2 * deltaTime <=
            depth
        ) {
          player.position[2] += Math.cos(-cameraRotation[1]) * 2 * deltaTime;
        }
      }
    }
    if (inputManager.keyPressed["KeyW"]) {
      if (camera == true) {
        if (
          player.position[0] -
            player.trunkScale[0] +
            Math.cos(-cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[0] +
            player.trunkScale[0] +
            Math.cos(-cameraRotation[1]) * 2 * deltaTime <=
            width
        ) {
          player.position[0] += Math.cos(-cameraRotation[1]) * 2 * deltaTime;
        }
        if (
          player.position[2] -
            player.trunkScale[2] +
            Math.sin(-cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[2] +
            player.trunkScale[2] +
            Math.sin(-cameraRotation[1]) * 2 * deltaTime <=
            depth
        ) {
          player.position[2] += Math.sin(-cameraRotation[1]) * 2 * deltaTime;
        }
      } else if (camera == false) {
        if (
          player.position[0] -
            player.trunkScale[0] +
            Math.cos(cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[0] +
            player.trunkScale[0] +
            Math.cos(cameraRotation[1]) * 2 * deltaTime <=
            width
        ) {
          player.position[0] += Math.cos(cameraRotation[1]) * 2 * deltaTime;
        }
        if (
          player.position[2] -
            player.trunkScale[2] +
            Math.sin(cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[2] +
            player.trunkScale[2] +
            Math.sin(cameraRotation[1]) * 2 * deltaTime <=
            depth
        ) {
          player.position[2] += Math.sin(cameraRotation[1]) * 2 * deltaTime;
        }
      }
    }
    if (inputManager.keyPressed["KeyS"]) {
      if (camera == true) {
        if (
          player.position[0] -
            player.trunkScale[0] -
            Math.cos(-cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[0] +
            player.trunkScale[0] -
            Math.cos(-cameraRotation[1]) * 2 * deltaTime <=
            width
        ) {
          player.position[0] -= Math.cos(-cameraRotation[1]) * 2 * deltaTime;
        }
        if (
          player.position[2] -
            player.trunkScale[2] -
            Math.sin(-cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[2] +
            player.trunkScale[2] -
            Math.sin(-cameraRotation[1]) * 2 * deltaTime <=
            depth
        ) {
          player.position[2] -= Math.sin(-cameraRotation[1]) * 2 * deltaTime;
        }
      } else if (camera == false) {
        if (
          player.position[0] -
            player.trunkScale[0] -
            Math.cos(cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[0] +
            player.trunkScale[0] -
            Math.cos(cameraRotation[1]) * 2 * deltaTime <=
            width
        ) {
          player.position[0] -= Math.cos(cameraRotation[1]) * 2 * deltaTime;
        }
        if (
          player.position[2] -
            player.trunkScale[2] -
            Math.sin(cameraRotation[1]) * 2 * deltaTime >=
            0 &&
          player.position[2] +
            player.trunkScale[2] -
            Math.sin(cameraRotation[1]) * 2 * deltaTime <=
            depth
        ) {
          player.position[2] -= Math.sin(cameraRotation[1]) * 2 * deltaTime;
        }
      }
    }

    //if mouse is clicked in the centre of the screen, move camera rotation based on mouse position on the screen
    if (
      inputManager.mouseClickedPos[0] < (screen.width / 3) * 2 &&
      inputManager.mouseClickedPos[0] > screen.width / 3 &&
      inputManager.mouseClickedPos[1] < (screen.height / 3) * 2 &&
      inputManager.mouseClickedPos[1] > screen.height / 3
    ) {
      if (inputManager.mouseX < screen.width / 3) {
        cameraRotation[1] -= 1 * deltaTime;
      }
      if (inputManager.mouseX > (screen.width / 3) * 2) {
        cameraRotation[1] += 1 * deltaTime;
      }
      if (inputManager.mouseY < screen.height / 3) {
        //set camera rotation boundary
        if (camera == false) {
          if (cameraRotation[2] > -1.5666) {
            cameraRotation[2] -= 2 * deltaTime;
          }
        } else if (camera == true) {
          if (cameraRotation[2] > -0.6666) {
            cameraRotation[2] -= 2 * deltaTime;
          }
        }
      }
      if (inputManager.mouseY > (screen.height / 3) * 2) {
        if (camera == false) {
          if (cameraRotation[2] < 1.5666) {
            cameraRotation[2] += 2 * deltaTime;
          }
        } else if (camera == true) {
          if (cameraRotation[2] < 2.3) {
            cameraRotation[2] += 2 * deltaTime;
          }
        }
      }
    }

    //use arrowkeys to move camera
    if (inputManager.keyPressed["ArrowLeft"]) {
      cameraRotation[1] -= 2 * deltaTime;
    }
    if (inputManager.keyPressed["ArrowRight"]) {
      cameraRotation[1] += 2 * deltaTime;
    }
    if (inputManager.keyPressed["ArrowUp"]) {
      if (camera == false) {
        if (cameraRotation[2] > -1.5666) {
          cameraRotation[2] -= 2 * deltaTime;
        }
      } else if (camera == true) {
        if (cameraRotation[2] > -0.6666) {
          cameraRotation[2] -= 2 * deltaTime;
        }
      }
    }
    if (inputManager.keyPressed["ArrowDown"]) {
      if (camera == false) {
        if (cameraRotation[2] < 1.5666) {
          cameraRotation[2] += 2 * deltaTime;
        }
      } else if (camera == true) {
        if (cameraRotation[2] < 2.3) {
          cameraRotation[2] += 2 * deltaTime;
        }
      }
    }

    //if 'C' is pressed, change camera boolan and invert camer rotation
    if (inputManager.CPressed == true) {
      if (camera == false) {
        cameraRotation[1] = cameraRotation[1] * -1;
        cameraRotation[2] = cameraRotation[2] * -1;
        cameraDistance = 5;
        camera = true;
      } else if (camera == true) {
        cameraRotation[1] = cameraRotation[1] * -1;
        cameraRotation[2] = cameraRotation[2] * -1;
        cameraDistance = 0;
        camera = false;
      }
      inputManager.check = 0;
      inputManager.CPressed = false;
    }

    //if wheel is scrolled, zoom in or out and clear wheeldelta value
    if (inputManager.wheelDelta < 0) {
      if (camera == true && cameraDistance > 1) {
        cameraDistance -= (inputManager.wheelDelta / 3) * -1;
        inputManager.clear();
      } else if (camera == false) {
        field -= (inputManager.wheelDelta / 3) * -1;
        inputManager.clear();
      }
    }
    if (inputManager.wheelDelta > 0) {
      if (camera == true) {
        cameraDistance += inputManager.wheelDelta / 3;
        inputManager.clear();
      } else if (camera == false) {
        field += inputManager.wheelDelta / 3;
        inputManager.clear();
      }
    }
  };

  // allocate matrices
  const projectionMatrix = glMatrix.mat4.create();
  const viewMatrix = glMatrix.mat4.create();
  const worldMatrix = glMatrix.mat4.create();
  const normalMatrix = glMatrix.mat3.create();

  // redraw the scene
  let render = function() {
    // clear the screen
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.65, 0.741, 0.859, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 4) clear the depth buffer
    gl.clear(gl.DEPTH_BUFFER_BIT);

    if (camera == false) {
      // calculate the projection matrix
      {
        const aspect = canvas.width / canvas.height;
        const fovy = glMatrix.glMatrix.toRadian(field);
        const near = 0.1;
        const far = 100;

        glMatrix.mat4.perspective(projectionMatrix, fovy, aspect, near, far);
        gl.uniformMatrix4fv(
          shader["u_projectionMatrix"],
          false,
          projectionMatrix
        );
      }

      // calculate the view matrix
      {
        fps[0] = player.position[0] + 1;
        fps[1] = player.position[1] + player.height;
        fps[2] = player.position[2];

        glMatrix.vec3.set(
          cameraPosition,
          player.position[0],
          player.position[1] + player.height,
          player.position[2]
        );

        glMatrix.vec3.rotateZ(fps, fps, cameraPosition, cameraRotation[2] * -1);
        glMatrix.vec3.rotateY(
          fps,
          fps,
          player.position,
          cameraRotation[1] * -1
        );

        gl.uniform3fv(shader["u_cameraPosition"], cameraPosition);

        const target = [fps[0], fps[1], fps[2]];

        const up = [0, 1, 0];

        glMatrix.mat4.lookAt(viewMatrix, cameraPosition, target, up);
        gl.uniformMatrix4fv(shader["u_viewMatrix"], false, viewMatrix);
      }

      // set up world matrix
      {
        glMatrix.mat4.identity(worldMatrix);
        glMatrix.mat4.translate(worldMatrix, worldMatrix, [
          -width / 2.0,
          -height / 2.0,
          -depth / 2.0
        ]);
        gl.uniformMatrix4fv(shader["u_worldMatrix"], false, worldMatrix);
      }

      //lighting
      {
        const ambientIntensity = [0.1, 0.1, 0.1];
        gl.uniform3fv(
          shader["u_ambientIntensity"],
          new Float32Array(ambientIntensity)
        );

        const lightIntensity = [1.5, 1.5, 1.5];
        gl.uniform3fv(
          shader["u_lightIntensity"],
          new Float32Array(lightIntensity)
        );

        const lightDirection = [1, 0.5, 1];
        gl.uniform3fv(
          shader["u_lightPosition"],
          new Float32Array(lightDirection)
        );
      }
    } else if (camera == true) {
      // calculate the projection matrix
      {
        const near = 0.1;
        const far = 100;

        //glMatrix.mat4.perspective(projectionMatrix, fovy, aspect, near, far);
        glMatrix.mat4.ortho(projectionMatrix, -10, 10, -10, 10, near, far);
        gl.uniformMatrix4fv(
          shader["u_projectionMatrix"],
          false,
          projectionMatrix
        );
      }

      // calculate the view matrix
      {
        glMatrix.vec3.set(
          cameraPosition,
          player.position[0] - cameraDistance,
          player.position[1] + 5,
          player.position[2]
        );

        glMatrix.vec3.rotateZ(
          cameraPosition,
          cameraPosition,
          player.position,
          cameraRotation[2]
        );
        glMatrix.vec3.rotateY(
          cameraPosition,
          cameraPosition,
          player.position,
          cameraRotation[1]
        );

        gl.uniform3fv(shader["u_cameraPosition"], cameraPosition);

        const target = [
          player.position[0],
          player.position[1],
          player.position[2]
        ];

        const up = [0, 1, 0];

        glMatrix.mat4.lookAt(viewMatrix, cameraPosition, target, up);
        gl.uniformMatrix4fv(shader["u_viewMatrix"], false, viewMatrix);
      }

      // set up world matrix
      {
        glMatrix.mat4.identity(worldMatrix);
        glMatrix.mat4.translate(worldMatrix, worldMatrix, [
          -width / 2.0,
          -height / 2.0,
          -depth / 2.0
        ]);
        gl.uniformMatrix4fv(shader["u_worldMatrix"], false, worldMatrix);
      }

      player.render(gl, shader);
    }

    // render the plane
    plane.render(gl, shader);

    for (let i = 0; i < trees.length; i++) {
      trees[i].createBranch(gl, shader);
      trees[i].renderBranch(gl, shader);
      trees[i].createTrunk(gl, shader);
      trees[i].renderTrunk(gl, shader);
    }
  };
  // start it going
  animate(0);
}

/**
 * Load the selected level file and run it.
 * @param {*} e
 */
function onFileSelect(e) {
  let files = e.target.files;

  console.log(files);

  if (files.length > 0) {
    let reader = new FileReader();

    reader.onload = function(e) {
      let json = JSON.parse(e.target.result);
      console.log(json);
      run(json);
    };

    reader.readAsText(files[0]);
  }
}

function main() {
  // Check for the various File API support.
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    document
      .getElementById("files")
      .addEventListener("change", onFileSelect, false);
  } else {
    alert("The File APIs are not fully supported in this browser.");
    return;
  }
}
