"use strict"

let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    render: {
        pixelArt: true  // prevent pixel art from getting blurred when scaled
    },
    width: 1280,
    height: 800,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [Load, Title, Pause, End, Game]
}

var cursors;
const SCALE = 2.0;
var my = {sprite: {}};

const game = new Phaser.Game(config);

game.events.once("ready", () => {
    const canvas = game.canvas;
    canvas.tabIndex = 0;
    canvas.addEventListener("pointerdown", () => canvas.focus());
});
