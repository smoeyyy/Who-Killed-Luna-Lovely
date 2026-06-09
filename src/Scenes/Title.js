class Title extends BookScene {
    constructor() {
        super("titleScene");
    }

    create() {
        this.cameras.main.setBackgroundColor("#251b20");
        const layout = this.createBook();

        this.add.text(
            layout.leftX,
            layout.top + layout.pageHeight * 0.3,
            "Who Killed\nLuna Lovely?",
            {
                font: "bold 36px Georgia",
                color: "#4b2929",
                align: "center"
            }
        ).setOrigin(0.5);

        this.add.text(
            layout.leftX,
            layout.top + layout.pageHeight * 0.82,
            "By Trinity Willis",
            {
                font: "18px Georgia",
                color: "#5d3a31"
            }
        ).setOrigin(0.5);

        this.createButton(
            layout.rightX,
            layout.top + layout.pageHeight * 0.42,
            "Start",
            () => this.scene.start("gameScene")
        );

        this.createButton(
            layout.rightX,
            layout.top + layout.pageHeight * 0.62,
            "Tutorial",
            () => this.scene.launch("pauseScene", { returnScene: "titleScene" })
        );
    }

}
