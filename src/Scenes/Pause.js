class Pause extends Phaser.Scene {
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
            () => this.restartToTitle()
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

    createBook() {
        const width = this.scale.width;
        const height = this.scale.height;
        const coverWidth = Math.min(width * 0.82, 1020);
        const coverHeight = coverWidth * 160 / 224;
        const pageHeight = coverHeight * 0.9;
        const pageWidth = pageHeight * 104 / 147;
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        const pageGap = coverWidth * 0.012;

        this.add.image(centerX, centerY, "bookCover")
            .setDisplaySize(coverWidth, coverHeight);

        const leftX = centerX - pageWidth * 0.5 - pageGap;
        const rightX = centerX + pageWidth * 0.5 + pageGap;

        this.add.image(leftX, centerY, "pageLeft")
            .setDisplaySize(pageWidth, pageHeight);
        this.add.image(rightX, centerY, "pageRight")
            .setDisplaySize(pageWidth, pageHeight);

        return {
            leftX,
            rightX,
            top: centerY - pageHeight * 0.5,
            pageWidth,
            pageHeight
        };
    }

    createButton(x, y, label, callback) {
        const button = this.add.text(x, y, label, {
            font: "bold 20px Georgia",
            color: "#4b2929",
            backgroundColor: "#e5b77d",
            padding: { x: 18, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on("pointerover", () => button.setColor("#8b3f32"));
        button.on("pointerout", () => button.setColor("#4b2929"));
        button.on("pointerdown", callback);
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
