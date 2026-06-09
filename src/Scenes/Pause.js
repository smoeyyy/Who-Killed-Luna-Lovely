class Pause extends BookScene {
    constructor() {
        super("pauseScene");
    }

    init(data) {
        this.returnScene = data.returnScene || "gameScene";
    }

    create() {
        this.cameras.main.setBackgroundColor("rgba(20, 14, 18, 0.88)");
        const layout = this.createBook();

        this.add.text(
            layout.leftX,
            layout.top + layout.pageHeight * 0.18,
            "Objectives:",
            {
                font: "bold 24px Georgia",
                color: "#4b2929"
            }
        ).setOrigin(0.5, 0);

        this.add.text(
            layout.leftX,
            layout.top + layout.pageHeight * 0.32,
            "Explore Prim Valley\nQuestion the townspeople\nFind the murderer\n\n\n\n\n\nESC to PAUSE/UNPAUSE\nWASD to MOVE",
            {
                font: "20px Georgia",
                color: "#55372f",
                align: "center",
                lineSpacing: 10
            }
        ).setOrigin(0.5, 0);

        this.add.text(
            layout.rightX,
            layout.top + layout.pageHeight * 0.18,
            "Credits:",
            {
                font: "bold 24px Georgia",
                color: "#4b2929"
            }
        ).setOrigin(0.5, 0);

        this.add.text(
            layout.rightX,
            layout.top + layout.pageHeight * 0.32,
            "Game design and implementation\nTrinity Willis\n\nUses free assets from itch.io,\nlinks in README",
            {
                font: "18px Georgia",
                color: "#55372f",
                align: "center",
                wordWrap: { width: layout.pageWidth * 0.8 }
            }
        ).setOrigin(0.5, 0);

        this.createButton(
            layout.rightX,
            layout.top + layout.pageHeight * 0.72,
            "Restart",
            () => this.restartToTitle(),
            {
                font: "bold 20px Georgia",
                padding: { x: 18, y: 8 }
            }
        );

        this.escapeKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC,
            true
        );
        this.escapeReleased = this.escapeKey.isUp;
    }

    update() {
        if (!this.escapeReleased) {
            this.escapeReleased = this.escapeKey.isUp;
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            this.closePause();
        }
    }

    closePause() {
        if (this.returnScene === "gameScene") {
            const gameScene = this.scene.get("gameScene");

            if (gameScene) {
                gameScene.resumeFromPause();
            }
        }

        this.scene.stop();
    }

    restartToTitle() {
        this.scene.stop("gameScene");
        this.scene.stop("titleScene");
        this.scene.start("titleScene");
    }
}
