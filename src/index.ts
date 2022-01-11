import { FullScreenUtils } from "webgl-framework";
import { Renderer } from "./Renderer";
import { FreeMovement } from "./FreeMovement";

function ready(fn: () => void) {
    if (document.readyState !== "loading") {
        fn();
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

ready(() => {
    initUI();

    const url = new URL(window.location.href);
    const noLights = url.hash === "#nolights";

    const renderer = new Renderer();
    renderer.lightning = !noLights;
    renderer.init("canvasGL", true);
    const canvas = document.getElementById("canvasGL")!;
    new FreeMovement(
        renderer,
        {
            canvas,
            movementSpeed: 25,
            rotationSpeed: 0.006
        }
    );

    const fullScreenUtils = new FullScreenUtils();

    const toggleFullscreenElement = document.getElementById("toggleFullscreen")!;
    toggleFullscreenElement.addEventListener("click", () => {
        if (document.body.classList.contains("fs")) {
            fullScreenUtils.exitFullScreen();
        } else {
            fullScreenUtils.enterFullScreen();
        }
        fullScreenUtils.addFullScreenListener(function () {
            if (fullScreenUtils.isFullScreen()) {
                document.body.classList.add("fs");
            } else {
                document.body.classList.remove("fs");
            }
        });
    });

    canvas.addEventListener("click", () => renderer.changeScene());
});

function initUI(): void { }
