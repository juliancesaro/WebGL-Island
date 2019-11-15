"use strict";

class Triangle {
    constructor(point1, point2, point3, faceNormal) {
        this.point1 = point1;
        this.point2 = point2;
        this.point3 = point3;
        this.faceNormal = [faceNormal[0], faceNormal[1], faceNormal[2]];
    }
}
