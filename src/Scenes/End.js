class End extends BookScene {
    constructor() {
        super("endScene");
    }

    create() {
        this.cameras.main.setBackgroundColor("#251b20");
        const layout = this.createBook();

        this.add.text(
            layout.leftX,
            layout.top + layout.pageHeight * 0.5,
            "You solved the\nmurder of\nLuna Lovely!",
            {
                font: "bold 34px Georgia",
                color: "#4b2929",
                align: "center"
            }
        ).setOrigin(0.5);

        this.add.text(
            layout.rightX,
            layout.top + layout.pageHeight * 0.42,
            "The End",
            {
                font: "bold 34px Georgia",
                color: "#4b2929"
            }
        ).setOrigin(0.5);

        this.createButton(
            layout.rightX,
            layout.top + layout.pageHeight * 0.58,
            "Restart",
            () => this.restartGame()
        );
    }

    restartGame() {
        this.scene.stop("gameScene");
        this.scene.stop("pauseScene");
        this.scene.stop("titleScene");
        this.scene.start("titleScene");
    }
}
