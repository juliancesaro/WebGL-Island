"use strict;"

class Player {

    constructor(gl) {
        this.position = [0, 0, 0];
        this.height = 1;
        this.rotation = [0, 0, 0];
        this.trunkScale = [0.2, 1, 0.2];
        this.matrix = glMatrix.mat4.create();
        this.normalMatrix = glMatrix.mat3.create();

        //create circle for base
        const nSides = 36;
        let playerPointsBase = [];

        const theta = 2 * Math.PI / nSides;
        for (let i = 0; i < nSides * 2; i++) {
            playerPointsBase.push(Math.sin(i * theta));
            playerPointsBase.push(0);
            playerPointsBase.push(Math.cos(i * theta));
        }

        this.nPoints = playerPointsBase.length / 3;

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(playerPointsBase), gl.STATIC_DRAW);

        let playerPointsTop = [];

        for (let i = 0; i < nSides * 2; i++) {
            playerPointsTop.push(Math.sin(i * theta));
            playerPointsTop.push(this.height);
            playerPointsTop.push(Math.cos(i * theta));
        }

        this.n1Points = playerPointsTop.length / 3;

        this.position1Buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.position1Buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(playerPointsTop), gl.STATIC_DRAW);

        //push vertices of the circles to create trunk in between them
        let playerPoints = [];
        for(let i = 0; i < nSides * 2; i++){
            playerPoints.push(playerPointsTop[3*i]);
            playerPoints.push(playerPointsTop[3*i+1]);
            playerPoints.push(playerPointsTop[3*i+2]);

            playerPoints.push(playerPointsBase[3*i]);
            playerPoints.push(playerPointsBase[3*i+1]);
            playerPoints.push(playerPointsBase[3*i+2]);

            playerPoints.push(playerPointsBase[3*i+3]);
            playerPoints.push(playerPointsBase[3*i+4]);
            playerPoints.push(playerPointsBase[3*i+5]);

            playerPoints.push(playerPointsBase[3*i+3]);
            playerPoints.push(playerPointsBase[3*i+4]);
            playerPoints.push(playerPointsBase[3*i+5]);

            playerPoints.push(playerPointsTop[3*i+3]);
            playerPoints.push(playerPointsTop[3*i+4]);
            playerPoints.push(playerPointsTop[3*i+5]);

            playerPoints.push(playerPointsTop[3*i]);
            playerPoints.push(playerPointsTop[3*i+1]);
            playerPoints.push(playerPointsTop[3*i+2]);
        }

        this.n2Points = playerPoints.length / 3;

        this.position2Buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.position2Buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(playerPoints), gl.STATIC_DRAW);

        let normals = [];

        let triangles = [];

        // loop over each triangle in the points array
        let faceNormal = glMatrix.vec3.create();
        let v10 = glMatrix.vec3.create();
        let v20 = glMatrix.vec3.create();

        for (let i = 0; i < this.n2Points / 3; i++){
            const p0 = playerPoints.slice(i * 9, i * 9 + 3);
            const p1 = playerPoints.slice(i * 9 + 3, i * 9 + 6);
            const p2 = playerPoints.slice(i * 9 + 6, i * 9 + 9);

            glMatrix.vec3.subtract(v10, p1, p0);
            glMatrix.vec3.subtract(v20, p2, p0);
            glMatrix.vec3.cross(faceNormal, v10, v20);
            glMatrix.vec3.normalize(faceNormal, faceNormal);

            triangles.push(new Triangle(p0, p1, p2, [faceNormal[0], faceNormal[1],
                faceNormal[2]]));

            // three copies, one for each vertex
            normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
            normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
            normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
        }

        let smoothNormals = [];

        //for each vertex, calculate the average of the neighbouring faces' facenormals
        for (let i = 0; i < playerPoints.length/3; i++) {
            let point = [playerPoints[3*i], 0, playerPoints[3*i+2]];
            let faces = [];
            let avg = [0, 0, 0];
            for (let k = 0; k < triangles.length; k++) {
                if ((triangles[k].point1[0] == point[0] && triangles[k].point1[2] == point[2]) ||
                    (triangles[k].point2[0] == point[0] && triangles[k].point2[2] == point[2]) ||
                    (triangles[k].point3[0] == point[0] && triangles[k].point3[2] == point[2])) {
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
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(smoothNormals), gl.STATIC_DRAW);
    }

    render(gl, shader) {

        // set the world matrix
        glMatrix.mat4.identity(this.matrix);
        glMatrix.mat4.translate(this.matrix, this.matrix, this.position);
        glMatrix.mat4.rotateY(this.matrix, this.matrix, this.rotation[1]);  // heading
        glMatrix.mat4.rotateX(this.matrix, this.matrix, this.rotation[0]);  // pitch
        glMatrix.mat4.rotateZ(this.matrix, this.matrix, this.rotation[2]);  // roll
        glMatrix.mat4.scale(this.matrix, this.matrix, this.trunkScale);
        gl.uniformMatrix4fv(shader["u_worldMatrix"], false, this.matrix);

        // 2) set the normal matrix
        glMatrix.mat3.normalFromMat4(this.normalMatrix, this.matrix);
        gl.uniformMatrix3fv(shader["u_normalMatrix"], false, this.normalMatrix);

        // 1) Set the diffuse material to yellow
        gl.uniform3fv(shader["u_diffuseMaterial"], new Float32Array([0.055, 0.302, 0.573]));

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