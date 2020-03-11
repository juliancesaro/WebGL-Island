"use strict";

class Tree {
  constructor(gl) {
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.trunkScale = [0.2, 1, 0.2];
    this.branchPosition = [0, 3, 0];
    this.branchScale = [1, 1, 1];
    this.normalMatrix = glMatrix.mat3.create();
    this.matrix = glMatrix.mat4.create();
  }

  createBranch(gl) {
    let points = [
      //base
      -1,
      0,
      -1,
      1,
      0,
      -1,
      1,
      0,
      1,

      1,
      0,
      1,
      -1,
      0,
      1,
      -1,
      0,
      -1,

      // sides
      0,
      1,
      0,
      -1,
      0,
      -1,
      -1,
      0,
      1,

      0,
      1,
      0,
      -1,
      0,
      1,
      1,
      0,
      1,

      0,
      1,
      0,
      1,
      0,
      1,
      1,
      0,
      -1,

      -1,
      0,
      -1,
      0,
      1,
      0,
      1,
      0,
      -1
    ];

    this.n3Points = points.length / 3;

    this.position3Buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position3Buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    //Add face normals to the branches
    let normals = [];

    let triangles = [];

    //loop over each triangle in the points array
    let faceNormal = glMatrix.vec3.create();
    let v10 = glMatrix.vec3.create();
    let v20 = glMatrix.vec3.create();

    for (let i = 0; i < this.n3Points / 3; i++) {
      const p0 = points.slice(i * 9, i * 9 + 3);
      const p1 = points.slice(i * 9 + 3, i * 9 + 6);
      const p2 = points.slice(i * 9 + 6, i * 9 + 9);

      glMatrix.vec3.subtract(v10, p1, p0);
      glMatrix.vec3.subtract(v20, p2, p0);
      glMatrix.vec3.cross(faceNormal, v10, v20);
      glMatrix.vec3.normalize(faceNormal, faceNormal);

      triangles.push(
        new Triangle(p0, p1, p2, [faceNormal[0], faceNormal[1], faceNormal[2]])
      );

      // three copies, one for each vertex
      normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
      normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
      normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
    }

    let smoothNormals = [];

    //for each vertex, calculate the average of the neighbouring faces' facenormals
    for (let i = 0; i < points.length / 3; i++) {
      let point = [points[3 * i], 0, points[3 * i + 2]];
      let faces = [];
      let avg = [0, 0, 0];
      for (let k = 0; k < triangles.length; k++) {
        if (
          (triangles[k].point1[0] == point[0] &&
            triangles[k].point1[2] == point[2]) ||
          (triangles[k].point2[0] == point[0] &&
            triangles[k].point2[2] == point[2]) ||
          (triangles[k].point3[0] == point[0] &&
            triangles[k].point3[2] == point[2])
        ) {
          faces.push(triangles[k].faceNormal);
        }
      }
      for (let j = 0; j < faces.length; j++) {
        avg[0] += faces[j][0];
        avg[1] += faces[j][1];
        avg[2] += faces[j][2];
      }
      avg[0] = avg[0] / faces.length;
      avg[1] = avg[1] / faces.length;
      avg[2] = avg[2] / faces.length;
      smoothNormals.push(avg[0], avg[1], avg[2]);
    }

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(smoothNormals),
      gl.STATIC_DRAW
    );
  }

  createTrunk(gl) {
    //create circle for base
    const nSides = 36;
    let trunkPointsBase = [];

    const theta = (2 * Math.PI) / nSides;
    for (let i = 0; i < nSides * 2; i++) {
      trunkPointsBase.push(Math.sin(i * theta));
      trunkPointsBase.push(0);
      trunkPointsBase.push(Math.cos(i * theta));
    }

    this.nPoints = trunkPointsBase.length / 3;

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(trunkPointsBase),
      gl.STATIC_DRAW
    );

    let trunkPointsTop = [];

    for (let i = 0; i < nSides * 2; i++) {
      trunkPointsTop.push(Math.sin(i * theta));
      trunkPointsTop.push(3);
      trunkPointsTop.push(Math.cos(i * theta));
    }

    this.n1Points = trunkPointsTop.length / 3;

    this.position1Buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position1Buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(trunkPointsTop),
      gl.STATIC_DRAW
    );

    //push vertices of the circles to create trunk in between them
    let trunkPoints = [];
    for (let i = 0; i < nSides * 2; i++) {
      trunkPoints.push(trunkPointsTop[3 * i]);
      trunkPoints.push(trunkPointsTop[3 * i + 1]);
      trunkPoints.push(trunkPointsTop[3 * i + 2]);

      trunkPoints.push(trunkPointsBase[3 * i]);
      trunkPoints.push(trunkPointsBase[3 * i + 1]);
      trunkPoints.push(trunkPointsBase[3 * i + 2]);

      trunkPoints.push(trunkPointsBase[3 * i + 3]);
      trunkPoints.push(trunkPointsBase[3 * i + 4]);
      trunkPoints.push(trunkPointsBase[3 * i + 5]);

      trunkPoints.push(trunkPointsBase[3 * i + 3]);
      trunkPoints.push(trunkPointsBase[3 * i + 4]);
      trunkPoints.push(trunkPointsBase[3 * i + 5]);

      trunkPoints.push(trunkPointsTop[3 * i + 3]);
      trunkPoints.push(trunkPointsTop[3 * i + 4]);
      trunkPoints.push(trunkPointsTop[3 * i + 5]);

      trunkPoints.push(trunkPointsTop[3 * i]);
      trunkPoints.push(trunkPointsTop[3 * i + 1]);
      trunkPoints.push(trunkPointsTop[3 * i + 2]);
    }

    this.n2Points = trunkPoints.length / 3;

    this.position2Buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position2Buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(trunkPoints),
      gl.STATIC_DRAW
    );

    let normals = [];

    let triangles = [];

    // loop over each triangle in the points array
    let faceNormal = glMatrix.vec3.create();
    let v10 = glMatrix.vec3.create();
    let v20 = glMatrix.vec3.create();

    for (let i = 0; i < this.n2Points / 3; i++) {
      const p0 = trunkPoints.slice(i * 9, i * 9 + 3);
      const p1 = trunkPoints.slice(i * 9 + 3, i * 9 + 6);
      const p2 = trunkPoints.slice(i * 9 + 6, i * 9 + 9);

      glMatrix.vec3.subtract(v10, p1, p0);
      glMatrix.vec3.subtract(v20, p2, p0);
      glMatrix.vec3.cross(faceNormal, v10, v20);
      glMatrix.vec3.normalize(faceNormal, faceNormal);

      triangles.push(
        new Triangle(p0, p1, p2, [faceNormal[0], faceNormal[1], faceNormal[2]])
      );

      //three copies, one for each vertex
      normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
      normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
      normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
    }

    let smoothNormals = [];

    //for each vertex, calculate the average of the neighbouring vertices facenormals
    for (let i = 0; i < trunkPoints.length / 3; i++) {
      let point = [trunkPoints[3 * i], 0, trunkPoints[3 * i + 2]];
      let faces = [];
      let avg = [0, 0, 0];
      for (let k = 0; k < triangles.length; k++) {
        if (
          (triangles[k].point1[0] == point[0] &&
            triangles[k].point1[2] == point[2]) ||
          (triangles[k].point2[0] == point[0] &&
            triangles[k].point2[2] == point[2]) ||
          (triangles[k].point3[0] == point[0] &&
            triangles[k].point3[2] == point[2])
        ) {
          faces.push(triangles[k].faceNormal);
        }
      }
      for (let j = 0; j < faces.length; j++) {
        avg[0] += faces[j][0];
        avg[1] += faces[j][1];
        avg[2] += faces[j][2];
      }
      avg[0] = avg[0] / faces.length;
      avg[1] = avg[1] / faces.length;
      avg[2] = avg[2] / faces.length;
      smoothNormals.push(avg[0], avg[1], avg[2]);
    }

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(smoothNormals),
      gl.STATIC_DRAW
    );
  }

  renderBranch(gl, shader) {
    // set the world matrix
    glMatrix.mat4.identity(this.matrix);
    glMatrix.mat4.translate(this.matrix, this.matrix, this.branchPosition);
    glMatrix.mat4.rotateY(this.matrix, this.matrix, this.rotation[1]); // heading
    glMatrix.mat4.rotateX(this.matrix, this.matrix, this.rotation[0]); // pitch
    glMatrix.mat4.rotateZ(this.matrix, this.matrix, this.rotation[2]); // roll
    glMatrix.mat4.scale(this.matrix, this.matrix, this.branchScale);
    gl.uniformMatrix4fv(shader["u_worldMatrix"], false, this.matrix);

    // 2) set the normal matrix
    glMatrix.mat3.normalFromMat4(this.normalMatrix, this.matrix);
    gl.uniformMatrix3fv(shader["u_normalMatrix"], false, this.normalMatrix);

    // 1) Set the diffuse material to green
    gl.uniform3fv(
      shader["u_diffuseMaterial"],
      new Float32Array([0.043, 0.4, 0.137])
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.position3Buffer);
    gl.vertexAttribPointer(shader["a_position"], 3, gl.FLOAT, false, 0, 0);

    // 2) Set the normal attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(shader["a_normal"], 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this.n3Points);
  }

  renderTrunk(gl, shader) {
    //set the world matrix
    glMatrix.mat4.identity(this.matrix);
    glMatrix.mat4.translate(this.matrix, this.matrix, this.position);
    glMatrix.mat4.rotateY(this.matrix, this.matrix, this.rotation[1]); // heading
    glMatrix.mat4.rotateX(this.matrix, this.matrix, this.rotation[0]); // pitch
    glMatrix.mat4.rotateZ(this.matrix, this.matrix, this.rotation[2]); // roll
    glMatrix.mat4.scale(this.matrix, this.matrix, this.trunkScale);
    gl.uniformMatrix4fv(shader["u_worldMatrix"], false, this.matrix);

    // 2) set the normal matrix
    glMatrix.mat3.normalFromMat4(this.normalMatrix, this.matrix);
    gl.uniformMatrix3fv(shader["u_normalMatrix"], false, this.normalMatrix);

    // 1) Set the diffuse material to brown
    gl.uniform3fv(
      shader["u_diffuseMaterial"],
      new Float32Array([0.435, 0.306, 0.126])
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.position2Buffer);
    gl.vertexAttribPointer(shader["a_position"], 3, gl.FLOAT, false, 0, 0);

    // 2) Set the normal attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(shader["a_normal"], 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this.n2Points);

    // draw it
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(shader["a_position"], 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.nPoints);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.position1Buffer);
    gl.vertexAttribPointer(shader["a_position"], 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.n1Points);
  }
}
