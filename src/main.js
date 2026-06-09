"use strict";

const config = {
    parent: "phaser-game",
    type: Phaser.CANVAS,
    render: {
        pixelArt: true
    },
    width: 1280,
    height: 800,
    physics: {
        default: "arcade",
        arcade: {
            debug: false
        }
    },
    scene: [Load, Title, Pause, End, Game]
};

const game = new Phaser.Game(config);

// Lets the game receive keyboard controls after the player clicks it.
game.events.once("ready", () => {
    const canvas = game.canvas;
    canvas.tabIndex = 0;
    canvas.addEventListener("pointerdown", () => canvas.focus());
});
