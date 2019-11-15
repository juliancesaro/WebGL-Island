"use strict";

class Input {
    constructor() {
        this.keyPressed = {};
        this.CPressed = false;

        this.check = 0;

        this.mouseClicked = false;
        this.mouseClickedPos = null;
        this.wheelDelta = 0;

        this.mouseX = 0;
        this.mouseY = 0;

        document.addEventListener("keydown", this.onKeyDown.bind(this));
        document.addEventListener("keyup", this.onKeyUp.bind(this));
        document.addEventListener("mousedown", this.onMouseDown.bind(this))
        document.addEventListener("wheel", this.onWheel.bind(this))
        document.addEventListener("mousemove", this.mouseMove.bind(this))
    }

    clear() {
        this.mouseClicked = false;
        this.wheelDelta = 0;
    }

    onKeyDown(event) {
        this.keyPressed[event.code] = true;
        if(event.code == "KeyC" && this.check == 0) {
            this.CPressed = true;
            this.check = 1;
        }
    }

    mouseMove(event) {
       this.mouseX = event.clientX;
       this.mouseY = event.clientY;
    }

    onKeyUp(event) {
        this.keyPressed[event.code] = false;
    }

    onMouseDown(event) {
        this.mouseClicked = true;
        this.mouseClickedPos = new Float32Array([event.clientX, event.clientY]);
    }

    onWheel(event) {
        this.wheelDelta = event.deltaY;
    }
}

const inputManager = new Input();