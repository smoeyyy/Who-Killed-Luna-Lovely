class BookScene extends Phaser.Scene {
    // Draws the book background and its two pages.
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

    // Creates a button that matches the style of the book screens.
    createButton(x, y, label, callback, style = {}) {
        const button = this.add.text(x, y, label, {
            font: "bold 24px Georgia",
            color: "#4b2929",
            backgroundColor: "#e5b77d",
            padding: { x: 20, y: 10 },
            ...style
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on("pointerover", () => button.setColor("#8b3f32"));
        button.on("pointerout", () => button.setColor("#4b2929"));
        button.on("pointerdown", callback);

        return button;
    }
}
