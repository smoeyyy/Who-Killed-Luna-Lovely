class Game extends Phaser.Scene {
    constructor() {
        super("gameScene");
    }

    create() {
        const preparedLevel = this.prepareTiledMap("levelMap");

        const levelMap = this.make.tilemap({ key: preparedLevel.key });
        const levelTilesets = this.addTilesets(levelMap);

        this.renderMapLayers(levelMap, levelTilesets);
        this.renderRockSlopeFallback(preparedLevel.mapData, preparedLevel.gidLookup);
        this.renderObjectLayers(levelMap, preparedLevel.gidLookup);
        this.doorTriggers = [];
        this.activeDoorContacts = new Set();
        this.createDoorTriggers(levelMap, preparedLevel.gidLookup);
        this.createInvestigationTriggers(levelMap, preparedLevel.gidLookup);
        this.collisionShapes = [];
        this.createTileLayerCollision(levelMap, preparedLevel.gidLookup);
        this.createObjectLayerCollision(levelMap, preparedLevel.gidLookup);

        const spawn = this.findNearestSpawn(
            565,
            607,
            levelMap.widthInPixels,
            levelMap.heightInPixels
        );
        this.createCharacterFrames();
        this.createPlayerAnimations();
        this.playerFacing = "down";
        this.player = this.add.sprite(spawn.x, spawn.y, "characters", "character-7-down-1");
        this.player.setDepth(1000 + spawn.y);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(12, 8).setOffset(2, 12);
        this.player.body.setAllowGravity(false);

        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.pauseKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC,
            true
        );
        this.pauseKey.on("down", this.openPauseScreen, this);
        this.gamePaused = false;

        this.cursors = this.input.keyboard.createCursorKeys();

        const worldWidth = levelMap.widthInPixels;
        const worldHeight = levelMap.heightInPixels;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBackgroundColor("#1f2a2b");

        this.createDialogueUI();
        this.add.text(16, 16, "WASD to move", { font: "16px Arial", fill: "#ffffff" }).setScrollFactor(0).setDepth(20000);
    }

    update() {
        if (!this.player || !this.player.body) {
            return;
        }

        if (this.gamePaused) {
            return;
        }

        if (this.dialogueOpen) {
            return;
        }

        this.frameDoorContacts = new Set();
        const speed = 120;
        const frameDistance = speed * (this.game.loop.delta / 1000);
        let moveX = 0;
        let moveY = 0;

        const left = this.keys.left.isDown || this.cursors.left.isDown;
        const right = this.keys.right.isDown || this.cursors.right.isDown;
        const up = this.keys.up.isDown || this.cursors.up.isDown;
        const down = this.keys.down.isDown || this.cursors.down.isDown;

        if (left) {
            moveX = -1;
        } else if (right) {
            moveX = 1;
        }

        if (up) {
            moveY = -1;
        } else if (down) {
            moveY = 1;
        }

        if (moveX !== 0 && moveY !== 0) {
            moveX *= Math.SQRT1_2;
            moveY *= Math.SQRT1_2;
        }

        const movement = this.movePlayer(moveX * frameDistance, moveY * frameDistance);
        this.updatePlayerAnimation(movement.x, movement.y);

        if (this.checkBlacksmithApproach()) {
            this.player.setDepth(1000 + this.player.y);
            return;
        }

        if (this.checkInvestigationTrail()) {
            this.player.setDepth(1000 + this.player.y);
            return;
        }

        if (this.checkFugitiveEncounter()) {
            this.player.setDepth(1000 + this.player.y);
            return;
        }

        if (this.checkCaseComplete()) {
            this.player.setDepth(1000 + this.player.y);
            return;
        }

        this.reportDoorContacts();
        this.player.setDepth(1000 + this.player.y);
    }

    openPauseScreen() {
        if (this.gamePaused || this.scene.manager.isActive("pauseScene")) {
            return;
        }

        this.gamePaused = true;
        this.physics.world.pause();
        this.player.anims.pause();
        this.input.enabled = false;
        this.scene.launch("pauseScene", { returnScene: "gameScene" });
        this.scene.bringToTop("pauseScene");
    }

    resumeFromPause() {
        this.gamePaused = false;
        this.physics.world.resume();
        this.player.anims.resume();
        this.input.enabled = true;
    }

    prepareTiledMap(mapKey) {
        const originalMap = this.cache.tilemap.get(mapKey).data;
        const mapData = JSON.parse(JSON.stringify(originalMap));
        const embeddedTilesets = mapData.tilesets.map((tileset) => this.embedTileset(tileset));
        const preparedKey = `${mapKey}_embedded`;

        mapData.tilesets = embeddedTilesets.filter((tileset) => !this.isImageCollection(tileset) && this.isTileLayerTileset(mapData.layers, tileset));
        this.cache.tilemap.add(preparedKey, {
            data: mapData,
            format: Phaser.Tilemaps.Formats.TILED_JSON
        });

        return {
            key: preparedKey,
            gidLookup: this.buildGidLookup(embeddedTilesets),
            mapData
        };
    }

    createPlayerAnimations() {
        ["down", "left", "right", "up"].forEach((direction) => {
            const key = `player-walk-${direction}`;

            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: [0, 1, 2].map((frame) => ({
                        key: "characters",
                        frame: `character-7-${direction}-${frame}`
                    })),
                    frameRate: 8,
                    repeat: -1
                });
            }
        });
    }

    createCharacterFrames() {
        const texture = this.textures.get("characters");
        const directions = ["down", "left", "right", "up"];

        for (let character = 0; character < 8; character++) {
            const blockX = (character % 4) * 48;
            const blockY = Math.floor(character / 4) * 80;

            directions.forEach((direction, directionIndex) => {
                for (let frame = 0; frame < 3; frame++) {
                    const frameName = `character-${character}-${direction}-${frame}`;

                    if (!texture.has(frameName)) {
                        texture.add(
                            frameName,
                            0,
                            blockX + frame * 16,
                            blockY + directionIndex * 20,
                            16,
                            20
                        );
                    }
                }
            });
        }
    }

    updatePlayerAnimation(moveX, moveY) {
        if (moveX === 0 && moveY === 0) {
            this.player.anims.stop();
            this.player.setFrame(`character-7-${this.playerFacing}-1`);
            return;
        }

        if (Math.abs(moveX) > Math.abs(moveY)) {
            this.playerFacing = moveX < 0 ? "left" : "right";
        } else {
            this.playerFacing = moveY < 0 ? "up" : "down";
        }

        this.player.play(`player-walk-${this.playerFacing}`, true);
    }

    embedTileset(mapTileset) {
        const sourceName = this.getTilesetSourceName(mapTileset.source);
        const source = TILESET_SOURCES.find((tileset) => tileset.name === sourceName || tileset.tsx.endsWith(`${sourceName}.tsx`));

        if (!source) {
            return mapTileset;
        }

        const xml = this.cache.text.get(source.key);
        const doc = new DOMParser().parseFromString(xml, "application/xml");
        const tilesetElement = doc.querySelector("tileset");
        const imageElement = this.getDirectChild(tilesetElement, "image");

        const embedded = {
            firstgid: mapTileset.firstgid,
            name: tilesetElement.getAttribute("name"),
            tilewidth: Number(tilesetElement.getAttribute("tilewidth")),
            tileheight: Number(tilesetElement.getAttribute("tileheight")),
            tilecount: Number(tilesetElement.getAttribute("tilecount")),
            columns: Number(tilesetElement.getAttribute("columns")),
            margin: Number(tilesetElement.getAttribute("margin") || 0),
            spacing: Number(tilesetElement.getAttribute("spacing") || 0)
        };

        const tiles = this.getDirectChildren(tilesetElement, "tile").map((tileElement) => this.parseTilesetTile(tileElement));

        if (imageElement) {
            const imageWidth = Number(imageElement.getAttribute("width"));
            const parsedColumns = embedded.columns || Math.floor(imageWidth / embedded.tilewidth);
            const parsedRows = Math.ceil(embedded.tilecount / parsedColumns);

            embedded.image = source.image;
            embedded.imagewidth = parsedColumns * embedded.tilewidth;
            embedded.imageheight = parsedRows * embedded.tileheight;

            if (tiles.length > 0) {
                embedded.tiles = tiles;
            }
        } else {
            embedded.tiles = tiles;
        }

        return embedded;
    }

    parseTilesetTile(tileElement) {
        const tileImage = this.getDirectChild(tileElement, "image");
        const tile = {
            id: Number(tileElement.getAttribute("id"))
        };

        if (tileImage) {
            tile.image = this.normalizeTilesetImagePath(tileImage.getAttribute("source"));
            tile.imagewidth = Number(tileImage.getAttribute("width"));
            tile.imageheight = Number(tileImage.getAttribute("height"));
        }

        const objectGroup = this.getDirectChild(tileElement, "objectgroup");

        if (objectGroup) {
            tile.objectgroup = {
                objects: this.getDirectChildren(objectGroup, "object").map((objectElement) => this.parseCollisionObject(objectElement))
            };
        }

        return tile;
    }

    parseCollisionObject(objectElement) {
        const object = {
            x: Number(objectElement.getAttribute("x") || 0),
            y: Number(objectElement.getAttribute("y") || 0),
            width: Number(objectElement.getAttribute("width") || 0),
            height: Number(objectElement.getAttribute("height") || 0)
        };
        const polygon = this.getDirectChild(objectElement, "polygon");

        if (polygon) {
            object.polygon = polygon.getAttribute("points").split(" ").map((point) => {
                const [x, y] = point.split(",").map(Number);
                return { x, y };
            });
        }

        return object;
    }

    isTileLayerTileset(layers, tileset) {
        const firstgid = tileset.firstgid;
        const lastgid = firstgid + (tileset.tilecount || 1) - 1;

        return layers.some((layer) => {
            if (layer.type === "group") {
                return this.isTileLayerTileset(layer.layers, tileset);
            }

            return layer.type === "tilelayer" && layer.data.some((gid) => gid >= firstgid && gid <= lastgid);
        });
    }

    isImageCollection(tileset) {
        return !tileset.image && Array.isArray(tileset.tiles);
    }

    getDirectChild(parent, tagName) {
        return this.getDirectChildren(parent, tagName)[0] || null;
    }

    getDirectChildren(parent, tagName) {
        return Array.from(parent.children).filter((child) => child.tagName === tagName);
    }

    getTilesetSourceName(sourcePath) {
        if (!sourcePath) {
            return "";
        }

        return sourcePath.split("/").pop().replace(".tsx", "");
    }

    normalizeTilesetImagePath(sourcePath) {
        return `assets/${sourcePath.replace("../../", "")}`;
    }

    addTilesets(map) {
        return map.tilesets
            .filter((tileset) => this.textures.exists(tileset.name))
            .map((tileset) => map.addTilesetImage(tileset.name, tileset.name));
    }

    renderMapLayers(map, tilesets) {
        map.layers.forEach((layerData, layerIndex) => {
            if (layerData.visible === false || layerData.name.endsWith("RockSlopes_Auto")) {
                return;
            }

            const layer = map.createLayer(layerData.name, tilesets, 0, 0);

            if (layer) {
                layer.setDepth(layerIndex);

                if (layerData.name.endsWith("Shadows")) {
                    layer.setDepth(90);
                    layer.setAlpha(0.18);
                    layer.setBlendMode(Phaser.BlendModes.NORMAL);
                } else {
                    layer.setAlpha(layerData.opacity ?? 1);
                }
            }
        });
    }

    buildGidLookup(tilesets) {
        const lookup = [];

        tilesets.forEach((tileset, index) => {
            const nextTileset = tilesets[index + 1];
            const firstgid = tileset.firstgid;
            const lastgid = nextTileset ? nextTileset.firstgid - 1 : firstgid + (tileset.tilecount || 1) - 1;

            lookup.push({ ...tileset, firstgid, lastgid });
        });

        return lookup;
    }

    renderObjectLayers(map, gidLookup) {
        map.objects.forEach((layer) => {
            if (layer.visible === false) {
                return;
            }

            layer.objects.forEach((object) => {
                const gid = object.gid;

                if (!gid) {
                    return;
                }

                const tileInfo = this.resolveObjectTile(gid, gidLookup);

                if (!tileInfo || !this.textures.exists(tileInfo.key)) {
                    return;
                }

                const sprite = this.add.image(object.x, object.y, tileInfo.key, tileInfo.frame);
                sprite.setOrigin(0, 1);
                sprite.setAlpha(this.getObjectAlpha(layer, object, tileInfo));

                if (tileInfo.tileset.name === "Objects_Shadows") {
                    sprite.setAlpha(0.18);
                    sprite.setBlendMode(Phaser.BlendModes.NORMAL);
                    sprite.setDepth(90);
                } else if (
                    tileInfo.tileset.name === "Buildings" ||
                    tileInfo.tileset.name === "Atlas_Buildings"
                ) {
                    sprite.setDepth(500);
                } else {
                    sprite.setDepth(1000 + object.y);
                }

                sprite.setVisible(object.visible !== false);
            });
        });
    }

    getObjectAlpha(layer, object, tileInfo) {
        const alpha = (layer.opacity ?? 1) * (object.opacity ?? 1);
        return tileInfo.tileset.name === "Objects_Shadows" ? 0.18 : alpha;
    }

    resolveObjectTile(gid, gidLookup) {
        const tileset = gidLookup.find((entry) => gid >= entry.firstgid && gid <= entry.lastgid);

        if (!tileset) {
            return null;
        }

        const localId = gid - tileset.firstgid;

        if (tileset.tiles) {
            const tile = tileset.tiles.find((entry) => entry.id === localId);

            if (tile?.image) {
                return { key: tile.image, tile, tileset };
            }
        }

        return {
            key: tileset.name,
            frame: localId,
            tile: tileset.tiles ? tileset.tiles.find((entry) => entry.id === localId) : null,
            tileset
        };
    }

    createTileLayerCollision(map, gidLookup) {
        map.layers.forEach((layer) => {
            const collisionLayer = layer.name.endsWith("RockSlopes_Auto") || layer.name === "Water";

            if (layer.visible === false || !collisionLayer) {
                return;
            }

            for (let y = 0; y < layer.height; y++) {
                for (let x = 0; x < layer.width; x++) {
                    const tile = layer.data[y][x];

                    if (!tile || tile.index <= 0) {
                        continue;
                    }

                    const tileInfo = this.resolveObjectTile(tile.index, gidLookup);

                    if (tileInfo?.tile?.objectgroup) {
                        this.addCollisionObjects(tile.pixelX, tile.pixelY, tileInfo.tile.objectgroup.objects);
                    }
                }
            }
        });
    }

    renderRockSlopeFallback(mapData, gidLookup) {
        const layer = mapData.layers.find((entry) => entry.name.endsWith("RockSlopes_Auto"));
        const tileset = gidLookup.find((entry) => entry.name === "Tileset_RockSlope");

        if (!layer || !tileset || !this.textures.exists(tileset.name)) {
            return;
        }

        layer.data.forEach((rawGid, index) => {
            const gid = rawGid & 0x1fffffff;

            if (gid < tileset.firstgid || gid > tileset.lastgid) {
                return;
            }

            const x = (index % layer.width) * mapData.tilewidth;
            const y = Math.floor(index / layer.width) * mapData.tileheight;
            const image = this.add.image(x, y, tileset.name, gid - tileset.firstgid);

            image.setOrigin(0);
            image.setDepth(100);
            image.setFlip(
                (rawGid & 0x80000000) !== 0,
                (rawGid & 0x40000000) !== 0
            );
        });
    }

    createObjectLayerCollision(map, gidLookup) {
        map.objects.forEach((layer) => {
            layer.objects.forEach((object) => {
                if (!object.gid) {
                    return;
                }

                const tileInfo = this.resolveObjectTile(object.gid, gidLookup);

                if (!tileInfo?.tile?.objectgroup) {
                    return;
                }

                const imageHeight = tileInfo.tile.imageheight || object.height || tileInfo.tileset.tileheight;
                this.addCollisionObjects(object.x, object.y - imageHeight, tileInfo.tile.objectgroup.objects);
            });
        });
    }

    createDialogueUI() {
        const camera = this.cameras.main;
        const panelWidth = camera.width * 0.44 / camera.zoom;
        const panelHeight = panelWidth * 30 / 62;
        const panelX = camera.width * 0.5;
        const panelY = camera.height * 0.5
            + camera.height * 0.5 / camera.zoom
            - panelHeight * 0.5
            - 10 / camera.zoom;

        this.dialoguePanel = this.add.image(0, 0, "travelBookPopup");
        this.dialoguePanel.setDisplaySize(panelWidth, panelHeight);

        this.dialogueText = this.add.text(
            0,
            -20,
            "What would you like to do?",
            {
                font: "10px Arial",
                color: "#3b271b",
                align: "center",
                wordWrap: { width: panelWidth - 44 }
            }
        ).setOrigin(0.5);

        this.knockOption = this.createDialogueOption(
            -34,
            panelHeight * 0.24,
            "Knock"
        );

        this.askOption = this.createDialogueOption(
            -48,
            panelHeight * 0.24,
            "Ask for information"
        );
        this.askOption.setVisible(false);

        this.explainOption = this.createDialogueOption(
            -42,
            panelHeight * 0.24,
            "Explain yourself"
        );
        this.explainOption.setVisible(false);

        this.pressOption = this.createDialogueOption(
            -34,
            panelHeight * 0.24,
            "Press on"
        );
        this.pressOption.setVisible(false);

        this.listenOption = this.createDialogueOption(
            0,
            panelHeight * 0.24,
            "Listen"
        );
        this.listenOption.setVisible(false);

        this.leaveOption = this.createDialogueOption(
            34,
            panelHeight * 0.24,
            "Leave"
        );

        this.dialogueContainer = this.add.container(
            panelX,
            panelY,
            [
                this.dialoguePanel,
                this.dialogueText,
                this.knockOption,
                this.askOption,
                this.explainOption,
                this.pressOption,
                this.listenOption,
                this.leaveOption
            ]
        );
        this.dialogueContainer.setScrollFactor(0);
        this.dialogueContainer.setDepth(30000);
        this.dialogueContainer.setVisible(false);
        this.dialogueOpen = false;
        this.houseDialogueState = {
            1: {
                informationLearned: false,
                situationExplained: false,
                informedAfterArrest: false
            },
            2: {
                stage: "initial",
                informedAfterArrest: false
            },
            3: {
                informationLearned: false,
                argumentResolved: false,
                informedAfterArrest: false
            },
            4: {
                informationAsked: false,
                approachHeard: false,
                listened: false,
                footprintsNoticed: false,
                signTrailNoticed: false,
                disturbedDirtNoticed: false,
                weaponFound: false,
                captured: false
            },
            caseCompletePending: false,
            caseCompleteShown: false
        };
        this.dialogueButtonY = camera.height
            - 10
            - panelHeight * camera.zoom * 0.5
            + panelHeight * 0.24 * camera.zoom;
        this.input.on("pointerdown", (pointer) => this.handleDialoguePointer(pointer));
    }

    createDialogueOption(x, y, label) {
        const option = this.add.text(
            x,
            y,
            label,
            {
                font: "10px Arial",
                color: "#523522",
                backgroundColor: "#e8bc83",
                padding: { x: 8, y: 4 }
            }
        ).setOrigin(0.5);

        return option;
    }

    handleDialoguePointer(pointer) {
        if (!this.dialogueOpen) {
            return;
        }

        const centerX = this.cameras.main.width * 0.5;
        const hitWidth = 52;
        const hitHeight = 24;
        const insideY = Math.abs(pointer.y - this.dialogueButtonY) <= hitHeight;

        if (!insideY) {
            return;
        }

        const optionWasClicked = (option) => (
            option.visible &&
            Math.abs(pointer.x - (centerX + option.x * this.cameras.main.zoom)) <= Math.max(
                hitWidth,
                (option.displayWidth || hitWidth) * this.cameras.main.zoom * 0.5
            )
        );

        if (
            this.dialogueStage === "blacksmith-caught" &&
            optionWasClicked(this.leaveOption)
        ) {
            this.showBlacksmithDenial();
        } else if (
            this.dialogueStage === "blacksmith-denial" &&
            optionWasClicked(this.leaveOption)
        ) {
            this.showBlacksmithConfession();
        } else if (
            this.dialogueStage === "blacksmith-confession" &&
            optionWasClicked(this.leaveOption)
        ) {
            this.showBlacksmithArrested();
        } else if (this.dialogueStage === "menu" && optionWasClicked(this.knockOption)) {
            this.showKnockDialogue();
        } else if (
            this.dialogueStage === "menu" &&
            optionWasClicked(this.listenOption)
        ) {
            this.showBlacksmithEavesdropping();
        } else if (
            this.dialogueStage === "house-3-intro" &&
            optionWasClicked(this.explainOption)
        ) {
            this.showHouseThreeExplanation();
        } else if (
            this.dialogueStage === "house-2-final" &&
            optionWasClicked(this.explainOption)
        ) {
            this.showHouseTwoBlacksmithComment();
        } else if (
            this.dialogueStage === "house-1-information" &&
            optionWasClicked(this.explainOption)
        ) {
            this.showHouseOneFinalInformation();
        } else if (
            this.dialogueStage === "house-1-intro" &&
            optionWasClicked(this.askOption)
        ) {
            this.showHouseOneInformation();
        } else if (
            this.dialogueStage === "house-3-explanation" &&
            optionWasClicked(this.askOption)
        ) {
            this.showHouseThreeInformation();
        } else if (
            this.dialogueStage === "house-3-information" &&
            optionWasClicked(this.askOption)
        ) {
            this.showHouseThreeArgument();
        } else if (
            this.dialogueStage === "house-3-argument" &&
            optionWasClicked(this.pressOption)
        ) {
            this.showHouseThreeArgumentFinal();
        } else if (
            this.dialogueStage === "house-2-offer" &&
            optionWasClicked(this.askOption)
        ) {
            this.showHouseTwoAdmission();
        } else if (
            this.dialogueStage === "house-2-admission" &&
            optionWasClicked(this.pressOption)
        ) {
            this.showHouseTwoFinalClue();
        } else if (
            this.dialogueStage === "house-4-question" &&
            optionWasClicked(this.askOption)
        ) {
            this.showBlacksmithInformation();
        } else if (optionWasClicked(this.leaveOption)) {
            this.closeDialogue();
        }
    }

    openDialogue(door) {
        this.currentDoor = door;
        this.dialogueText.setText("What would you like to do?");
        this.dialogueStage = "menu";
        this.knockOption.setVisible(true);
        this.askOption.setText("Ask for information");
        this.askOption.setVisible(false);
        this.explainOption.setText("Explain yourself");
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.listenOption.setVisible(false);
        this.leaveOption.setText("Leave");

        const blacksmithState = this.houseDialogueState[4];
        const canListen = (
            door.buildingId === 4 &&
            this.houseDialogueState[1].situationExplained &&
            blacksmithState.approachHeard &&
            !blacksmithState.listened
        );

        if (canListen) {
            this.dialogueText.setText("You hear the blacksmith muttering to himself.");
            this.knockOption.setPosition(-56, this.dialoguePanel.displayHeight * 0.24);
            this.listenOption.setVisible(true);
            this.leaveOption.setPosition(56, this.dialoguePanel.displayHeight * 0.24);
        } else {
            this.knockOption.setPosition(-34, this.dialoguePanel.displayHeight * 0.24);
            this.leaveOption.setPosition(34, this.dialoguePanel.displayHeight * 0.24);
        }

        this.player.anims.stop();
        this.updatePlayerAnimation(0, 0);
        this.dialogueContainer.setVisible(true);
        this.dialogueOpen = true;
    }

    showKnockDialogue() {
        const door = this.currentDoor;

        if (!door) {
            return;
        }

        this.knockOption.setVisible(false);
        this.listenOption.setVisible(false);
        const houseOneState = this.houseDialogueState[1];
        const houseTwoState = this.houseDialogueState[2];
        const houseThreeState = this.houseDialogueState[3];
        const blacksmithState = this.houseDialogueState[4];
        let shouldShowCharacter = true;

        if (
            blacksmithState.captured &&
            door.buildingId >= 1 &&
            door.buildingId <= 3
        ) {
            this.showPostArrestHouseDialogue(door.buildingId);
        } else if (door.buildingId === 1 && houseOneState.situationExplained) {
            this.showHouseOneFinalInformation();
        } else if (door.buildingId === 1 && houseOneState.informationLearned) {
            this.showHouseOneInformation();
        } else if (door.buildingId === 1) {
            this.dialogueStage = "house-1-intro";
            this.askOption.setVisible(true);
            this.leaveOption.setPosition(56, this.dialoguePanel.displayHeight * 0.24);
            this.dialogueText.setText(
                "Luna? Luna was my daughter. I can't believe someone would do something so gruesome. Please find the murderer so my Luna can rest in peace."
            );
        } else if (door.buildingId === 2 && houseTwoState.stage === "blacksmith-comment") {
            this.showHouseTwoBlacksmithComment();
        } else if (door.buildingId === 2 && houseTwoState.stage === "final") {
            this.showHouseTwoFinalClue();
        } else if (door.buildingId === 2 && houseTwoState.stage === "admission") {
            this.showHouseTwoAdmission();
        } else if (door.buildingId === 2) {
            this.dialogueStage = "house-2-offer";
            this.askOption.setVisible(houseThreeState.informationLearned);
            this.explainOption.setVisible(false);
            this.pressOption.setVisible(false);
            this.leaveOption.setPosition(
                houseThreeState.informationLearned ? 56 : 0,
                this.dialoguePanel.displayHeight * 0.24
            );
            this.dialogueText.setText(
                "Best shoe repairs west of Mount Kalamaya. 20 silver per shoe but you know you're paying for quality work here, quality work."
            );
        } else if (door.buildingId === 3 && houseThreeState.argumentResolved) {
            this.showHouseThreeArgumentFinal();
        } else if (door.buildingId === 3 && houseThreeState.informationLearned) {
            this.showHouseThreeInformation();
        } else if (door.buildingId === 3) {
            this.dialogueStage = "house-3-intro";
            this.askOption.setVisible(false);
            this.explainOption.setVisible(true);
            this.leaveOption.setPosition(52, this.dialoguePanel.displayHeight * 0.24);
            this.dialogueText.setText(
                "Oh, you're from out of town. We don't get many visitors in Prim Valley, especially not recently... I'm Lily."
            );
        } else if (
            door.buildingId === 4 &&
            (blacksmithState.captured || blacksmithState.listened)
        ) {
            shouldShowCharacter = false;
            this.showBlacksmithGone();
        } else if (door.buildingId === 4 && blacksmithState.informationAsked) {
            this.showBlacksmithInformation();
        } else if (door.buildingId === 4 && houseOneState.informationLearned) {
            this.dialogueStage = "house-4-question";
            this.askOption.setVisible(true);
            this.leaveOption.setPosition(56, this.dialoguePanel.displayHeight * 0.24);
            this.dialogueText.setText("Bah! Who are you? Go away. Shoo!");
        } else if (door.buildingId === 4) {
            this.dialogueStage = "house-4-dismissal";
            this.askOption.setVisible(false);
            this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
            this.dialogueText.setText("Bah! Who are you? Go away. Shoo!");
        } else {
            this.dialogueStage = "knocked";
            this.askOption.setVisible(false);
            this.explainOption.setVisible(false);
            this.pressOption.setVisible(false);
            this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
            this.dialogueText.setText(
                `Hello! This is placeholder dialogue for building ${door.buildingId}.`
            );
        }

        if (shouldShowCharacter && !this.dialogueCharacter) {
            this.dialogueCharacter = this.add.sprite(
                door.x + door.width + 8,
                door.y + door.height,
                "characters",
                `character-${door.characterIndex}-down-1`
            );
            this.dialogueCharacter.setOrigin(0.5, 1);
            this.dialogueCharacter.setDepth(1000 + this.dialogueCharacter.y);
        }
    }

    showPostArrestHouseDialogue(buildingId) {
        const postArrestDialogue = {
            1: "It was the blacksmith all along? Oh I knew something was wrong with that boy the way he looked at my Luna. Thank you for catching him detective, now my Luna can rest in peace.",
            2: "The blacksmith? I knew it. He never left that poor girl alone. Thank goodness he's gone for good.",
            3: "Oh my. I think I need to sit down. The blacksmith killed Luna? To know that I've been in love with my best friend's murderer, how can I ever forgive myself? Thank you for finding Luna's killer detective, but I need some time alone."
        };

        this.houseDialogueState[buildingId].informedAfterArrest = true;
        this.dialogueStage = `house-${buildingId}-post-arrest`;
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.listenOption.setVisible(false);
        this.leaveOption.setText("Leave");
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(postArrestDialogue[buildingId]);
    }

    showHouseTwoAdmission() {
        this.houseDialogueState[2].stage = "admission";
        this.dialogueStage = "house-2-admission";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(true);
        this.leaveOption.setPosition(34, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            "That little rascal Luna. She got on my nerves, she did, as did that little friend of hers, but I was too harsh on her. Kids will be kids, after all."
        );
    }

    showHouseTwoFinalClue() {
        this.houseDialogueState[2].stage = "final";
        this.dialogueStage = "house-2-final";
        const lilyConfessionLearned = this.houseDialogueState[3].argumentResolved;

        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setText("Explain the situation");
        this.explainOption.setVisible(lilyConfessionLearned);
        this.pressOption.setVisible(false);
        this.leaveOption.setPosition(
            lilyConfessionLearned ? 62 : 0,
            this.dialoguePanel.displayHeight * 0.24
        );
        this.dialogueText.setText(
            "I heard she got into a big argument with Lily the night before she was murdered. I'm not making any accusations here, but that may be worth looking into."
        );
    }

    showHouseTwoBlacksmithComment() {
        this.houseDialogueState[2].stage = "blacksmith-comment";
        this.dialogueStage = "house-2-blacksmith-comment";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            "All this over that blacksmith? He has shifty eyes, I've always said so."
        );
    }

    showHouseThreeExplanation() {
        this.dialogueStage = "house-3-explanation";
        this.explainOption.setVisible(false);
        this.askOption.setVisible(true);
        this.pressOption.setVisible(false);
        this.leaveOption.setPosition(56, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            "Oh my, you're a detective? You're here to solve Luna's murder?"
        );
    }

    showHouseThreeInformation() {
        this.houseDialogueState[3].informationLearned = true;
        this.dialogueStage = "house-3-information";
        const argumentClueLearned = this.houseDialogueState[2].stage === "final";

        this.knockOption.setVisible(false);
        this.askOption.setText("Ask about argument");
        this.askOption.setVisible(argumentClueLearned);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.leaveOption.setPosition(
            argumentClueLearned ? 60 : 0,
            this.dialoguePanel.displayHeight * 0.24
        );
        this.dialogueText.setText(
            "Luna was my best friend since we were children, I've been terribly distraught since she died. The cobbler never liked Luna and I, she might know something. Her house is the one with the flowers."
        );
    }

    showHouseThreeArgument() {
        this.dialogueStage = "house-3-argument";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(true);
        this.leaveOption.setPosition(34, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            "An argument with Luna? Yes, we did have an argument. I suppose there's no point in hiding it now. I've been in love with the blacksmith since the three of us were children, but he's only ever had eyes for Luna."
        );
    }

    showHouseThreeArgumentFinal() {
        this.houseDialogueState[3].argumentResolved = true;
        this.dialogueStage = "house-3-argument-final";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            "The day before she was murdered the blacksmith had brought her a lovely bouquet of daisies, my favorite flowers. He's been head over heels for ages now, but this was the final straw. I was so jealous of her in that moment, but I truly would never murder my best friend. I feel so terrible about it now, please, you must believe me!"
        );
    }

    showHouseOneInformation() {
        this.houseDialogueState[1].informationLearned = true;
        this.dialogueStage = "house-1-information";
        const blacksmithConfronted = this.houseDialogueState[4].informationAsked;

        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setText("Explain the situation");
        this.explainOption.setVisible(blacksmithConfronted);
        this.pressOption.setVisible(false);
        this.leaveOption.setPosition(
            blacksmithConfronted ? 62 : 0,
            this.dialoguePanel.displayHeight * 0.24
        );
        this.dialogueText.setText(
            "The blacksmith has been obsessed with my Luna for years and he's been acting strangely. He might know something. He lives in the smallest house in the Prim Valley."
        );
    }

    showHouseOneFinalInformation() {
        this.houseDialogueState[1].situationExplained = true;
        this.dialogueStage = "house-1-final";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            "He wouldn't talk to you? That figures. He's always been a bit of a weird one but he's been acting even more out of character recently. Since Luna's death he's been reclusive and refuses to leave his house. I can't tell if it's grief or if he has something to hide. Sometimes he mumbles to himself but I can never quite hear what he's saying"
        );
    }

    showBlacksmithInformation() {
        this.houseDialogueState[4].informationAsked = true;
        this.dialogueStage = "house-4-information";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            "I don't know anything about the murder and I don't want to talk. Leave. Now."
        );
    }

    showBlacksmithApproachDialogue(door) {
        this.houseDialogueState[4].approachHeard = true;
        this.currentDoor = door;
        this.dialogueStage = "house-4-approach";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.listenOption.setVisible(false);
        this.leaveOption.setText("I should probably go investigate");
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            "You hear noises coming from the blacksmith's house. There's a brief banging noise, some faint cursing, and then silence."
        );
        this.player.anims.stop();
        this.updatePlayerAnimation(0, 0);
        this.dialogueContainer.setVisible(true);
        this.dialogueOpen = true;
    }

    showBlacksmithEavesdropping() {
        this.houseDialogueState[4].listened = true;
        this.dialogueStage = "house-4-listened";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.listenOption.setVisible(false);
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            'You hear the blacksmith muttering, "Keys, papers, tools, what else am I missing? Oh, I should have gotten out of here sooner, now there\'s a detective after me. What am I going to do?"'
        );
    }

    showBlacksmithGone() {
        this.dialogueStage = "house-4-gone";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.listenOption.setVisible(false);
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText("No one answers.");
    }

    showInvestigationPopup(stage, text, optionText) {
        this.currentDoor = null;
        this.dialogueStage = stage;
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.listenOption.setVisible(false);
        this.leaveOption.setText(optionText);
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(text);
        this.player.anims.stop();
        this.updatePlayerAnimation(0, 0);
        this.dialogueContainer.setVisible(true);
        this.dialogueOpen = true;
    }

    spawnFugitiveBlacksmith() {
        const blacksmithState = this.houseDialogueState[4];

        if (
            !this.fugitivePosition ||
            this.fugitiveBlacksmith ||
            blacksmithState.captured
        ) {
            return;
        }

        const blacksmithDoor = this.doorTriggers.find(
            (door) => door.buildingId === 4
        );
        const characterIndex = blacksmithDoor?.characterIndex ?? 3;

        this.fugitiveBlacksmith = this.add.sprite(
            this.fugitivePosition.x,
            this.fugitivePosition.y,
            "characters",
            `character-${characterIndex}-down-1`
        );
        this.fugitiveBlacksmith.setOrigin(0.5, 1);
        this.fugitiveBlacksmith.setDepth(1000 + this.fugitiveBlacksmith.y);
    }

    showFugitiveEncounter() {
        this.dialogueStage = "blacksmith-caught";
        this.knockOption.setVisible(false);
        this.askOption.setVisible(false);
        this.explainOption.setVisible(false);
        this.pressOption.setVisible(false);
        this.listenOption.setVisible(false);
        this.leaveOption.setText("You killed Luna Lovely.");
        this.leaveOption.setPosition(0, this.dialoguePanel.displayHeight * 0.24);
        this.dialogueText.setText(
            "You catch the blacksmith at the edge of town and call out for him to stop. He turns around in surprise and stops, fiddling with his bag and refusing to make eye contact."
        );
        this.player.anims.stop();
        this.updatePlayerAnimation(0, 0);
        this.dialogueContainer.setVisible(true);
        this.dialogueOpen = true;
    }

    showBlacksmithDenial() {
        this.dialogueStage = "blacksmith-denial";
        this.leaveOption.setText("I found the hammer.");
        this.dialogueText.setText(
            "I-What-No! What would make you think such a thing?"
        );
    }

    showBlacksmithConfession() {
        this.dialogueStage = "blacksmith-confession";
        this.leaveOption.setText("Take him away.");
        this.dialogueText.setText(
            'The blacksmith\'s face drains of color, "I-Well-She deserved it! I was in love with that woman for years and she refused to even give me a chance. If I can\'t have her no one can!"'
        );
    }

    showBlacksmithArrested() {
        this.houseDialogueState[4].captured = true;
        this.dialogueStage = "blacksmith-arrested";

        if (this.fugitiveBlacksmith) {
            this.fugitiveBlacksmith.destroy();
            this.fugitiveBlacksmith = null;
        }

        this.leaveOption.setText("I should inform the townspeople.");
        this.dialogueText.setText(
            "You turn the blacksmith in to the local jail. He won't be getting out any time soon."
        );
    }

    showCaseCompleteDialogue() {
        this.houseDialogueState.caseCompletePending = false;
        this.houseDialogueState.caseCompleteShown = true;
        this.showInvestigationPopup(
            "case-complete",
            "The Prim Valley killer has been brought to justice. Your work here is done. Time to find another town, another mystery, and solve another case.",
            "Leave town"
        );
    }

    closeDialogue() {
        const closedStage = this.dialogueStage;

        if (this.dialogueCharacter) {
            this.dialogueCharacter.destroy();
            this.dialogueCharacter = null;
        }

        this.currentDoor = null;
        this.dialogueStage = null;
        this.dialogueContainer.setVisible(false);
        this.dialogueOpen = false;

        const closedPostArrestDialogue = /^house-[123]-post-arrest$/.test(
            closedStage || ""
        );
        const allTownspeopleInformed = [1, 2, 3].every(
            (buildingId) => this.houseDialogueState[buildingId].informedAfterArrest
        );

        if (
            closedPostArrestDialogue &&
            allTownspeopleInformed &&
            !this.houseDialogueState.caseCompleteShown
        ) {
            this.houseDialogueState.caseCompletePending = true;
            this.caseCompleteStartPosition = {
                x: this.player.x,
                y: this.player.y
            };
        }
    }

    createDoorTriggers(map, gidLookup) {
        const doorsByTileId = {
            0: [{ x: 34, y: 70, width: 22, height: 21 }],
            1: [{ x: 95, y: 88, width: 26, height: 24 }],
            2: [{ x: 121, y: 99, width: 28, height: 29 }],
            3: [{ x: 72, y: 97, width: 28, height: 31 }]
        };
        const characterIndicesByTileId = {
            0: 0,
            1: 1,
            2: 2,
            3: 3
        };

        map.objects.forEach((layer) => {
            layer.objects.forEach((object) => {
                if (!object.gid) {
                    return;
                }

                const tileInfo = this.resolveObjectTile(object.gid, gidLookup);

                if (tileInfo?.tileset.name !== "Buildings") {
                    return;
                }

                const localId = object.gid - tileInfo.tileset.firstgid;
                const doorDefinitions = doorsByTileId[localId];

                if (!doorDefinitions) {
                    return;
                }

                const imageHeight = tileInfo.tile.imageheight;
                const imageTop = object.y - imageHeight;

                doorDefinitions.forEach((door, doorIndex) => {
                    this.doorTriggers.push({
                        id: `building-${object.id}-door-${doorIndex}`,
                        buildingId: object.id,
                        characterIndex: characterIndicesByTileId[localId],
                        x: object.x + door.x,
                        y: imageTop + door.y,
                        width: door.width,
                        height: door.height
                    });
                });
            });
        });
    }

    createInvestigationTriggers(map, gidLookup) {
        const propObjects = [];

        map.objects.forEach((layer) => {
            layer.objects.forEach((object) => {
                if (!object.gid) {
                    return;
                }

                const tileInfo = this.resolveObjectTile(object.gid, gidLookup);
                const image = tileInfo?.tile?.image || "";

                if (
                    image.includes("BulletinBoard_1.png") ||
                    image.includes("HayStack_2.png") ||
                    image.includes("Banner_Stick_1_Purple.png")
                ) {
                    propObjects.push({
                        object,
                        image,
                        width: tileInfo.tile.imagewidth,
                        height: tileInfo.tile.imageheight
                    });
                }
            });
        });

        const sign = propObjects.find((entry) => entry.image.includes("BulletinBoard_1.png"));
        const banners = propObjects
            .filter((entry) => entry.image.includes("Banner_Stick_1_Purple.png"))
            .sort((a, b) => a.object.x - b.object.x);

        if (!sign || banners.length < 2) {
            this.investigationTriggers = null;
            return;
        }

        const entranceBanners = banners.slice(-2);
        this.fugitivePosition = {
            x: (
                entranceBanners[0].object.x +
                entranceBanners[0].width * 0.5 +
                entranceBanners[1].object.x +
                entranceBanners[1].width * 0.5
            ) * 0.5,
            y: (
                entranceBanners[0].object.y +
                entranceBanners[1].object.y
            ) * 0.5
        };

        const signCenter = {
            x: sign.object.x + sign.width * 0.5,
            y: sign.object.y - sign.height * 0.5
        };
        const haystack = propObjects
            .filter((entry) => (
                entry.image.includes("HayStack_2.png") &&
                entry.object.x < signCenter.x &&
                entry.object.y < signCenter.y
            ))
            .sort((a, b) => {
                const distanceA = Phaser.Math.Distance.Between(
                    signCenter.x,
                    signCenter.y,
                    a.object.x + a.width * 0.5,
                    a.object.y - a.height * 0.5
                );
                const distanceB = Phaser.Math.Distance.Between(
                    signCenter.x,
                    signCenter.y,
                    b.object.x + b.width * 0.5,
                    b.object.y - b.height * 0.5
                );
                return distanceA - distanceB;
            })[0];

        if (!haystack) {
            this.investigationTriggers = null;
            return;
        }

        const hayCenter = {
            x: haystack.object.x + haystack.width * 0.5,
            y: haystack.object.y - haystack.height * 0.5
        };

        this.investigationTriggers = {
            sign: new Phaser.Geom.Rectangle(
                signCenter.x - 34,
                signCenter.y - 30,
                68,
                60
            ),
            stairs: new Phaser.Geom.Rectangle(
                hayCenter.x - 76,
                hayCenter.y + 19,
                56,
                48
            ),
            haystack: new Phaser.Geom.Rectangle(
                haystack.object.x - 5,
                haystack.object.y - haystack.height - 5,
                haystack.width + 10,
                haystack.height + 10
            )
        };
    }

    collectDoorContactsAt(x, y) {
        const footBox = new Phaser.Geom.Rectangle(x - 6, y + 3, 12, 9);

        this.doorTriggers.forEach((door) => {
            const doorBounds = new Phaser.Geom.Rectangle(door.x, door.y, door.width, door.height);

            if (Phaser.Geom.Intersects.RectangleToRectangle(footBox, doorBounds)) {
                this.frameDoorContacts.add(door.id);
            }
        });
    }

    checkBlacksmithApproach() {
        const houseOneState = this.houseDialogueState[1];
        const houseTwoState = this.houseDialogueState[2];
        const houseThreeState = this.houseDialogueState[3];
        const blacksmithState = this.houseDialogueState[4];
        const allNpcCluesComplete = (
            houseOneState.situationExplained &&
            houseTwoState.stage === "blacksmith-comment" &&
            houseThreeState.argumentResolved &&
            blacksmithState.informationAsked
        );

        if (
            !allNpcCluesComplete ||
            blacksmithState.approachHeard ||
            this.dialogueOpen
        ) {
            return false;
        }

        const door = this.doorTriggers.find((entry) => entry.buildingId === 4);

        if (!door) {
            return false;
        }

        const approachBounds = new Phaser.Geom.Rectangle(
            door.x - 42,
            door.y - 34,
            door.width + 84,
            door.height + 76
        );
        const playerFeet = new Phaser.Geom.Rectangle(
            this.player.x - 6,
            this.player.y + 3,
            12,
            9
        );

        if (!Phaser.Geom.Intersects.RectangleToRectangle(playerFeet, approachBounds)) {
            return false;
        }

        this.showBlacksmithApproachDialogue(door);
        return true;
    }

    checkInvestigationTrail() {
        const blacksmithState = this.houseDialogueState[4];

        if (!blacksmithState.listened || !this.investigationTriggers) {
            return false;
        }

        const playerFeet = new Phaser.Geom.Rectangle(
            this.player.x - 6,
            this.player.y + 3,
            12,
            9
        );

        if (!blacksmithState.footprintsNoticed) {
            const door = this.doorTriggers.find((entry) => entry.buildingId === 4);

            if (!door) {
                return false;
            }

            const doorArea = new Phaser.Geom.Rectangle(
                door.x - 12,
                door.y - 12,
                door.width + 24,
                door.height + 24
            );

            if (
                this.activeDoorContacts.has(door.id) ||
                Phaser.Geom.Intersects.RectangleToRectangle(playerFeet, doorArea)
            ) {
                return false;
            }

            blacksmithState.footprintsNoticed = true;
            this.showInvestigationPopup(
                "blacksmith-footprints",
                "You spot footprints leading west from the blacksmith's door.",
                "I should follow him."
            );
            return true;
        }

        if (
            !blacksmithState.signTrailNoticed &&
            Phaser.Geom.Intersects.RectangleToRectangle(
                playerFeet,
                this.investigationTriggers.sign
            )
        ) {
            blacksmithState.signTrailNoticed = true;
            this.showInvestigationPopup(
                "blacksmith-sign-trail",
                "The footprints continue northwest.",
                "Continue."
            );
            return true;
        }

        if (
            blacksmithState.signTrailNoticed &&
            !blacksmithState.disturbedDirtNoticed &&
            Phaser.Geom.Intersects.RectangleToRectangle(
                playerFeet,
                this.investigationTriggers.stairs
            )
        ) {
            blacksmithState.disturbedDirtNoticed = true;
            this.showInvestigationPopup(
                "blacksmith-disturbed-dirt",
                "The dirt in this area is disheveled.",
                "I should look around."
            );
            return true;
        }

        if (
            blacksmithState.disturbedDirtNoticed &&
            !blacksmithState.weaponFound &&
            Phaser.Geom.Intersects.RectangleToRectangle(
                playerFeet,
                this.investigationTriggers.haystack
            )
        ) {
            blacksmithState.weaponFound = true;
            this.spawnFugitiveBlacksmith();
            this.showInvestigationPopup(
                "blacksmith-weapon-found",
                "You find the murder weapon stashed in the haybale. A blacksmith's hammer, caked with dried blood.",
                "I need to find the blacksmith. Now."
            );
            return true;
        }

        return false;
    }

    checkFugitiveEncounter() {
        const blacksmithState = this.houseDialogueState[4];

        if (
            !blacksmithState.weaponFound ||
            blacksmithState.captured ||
            !this.fugitiveBlacksmith
        ) {
            return false;
        }

        const playerFeet = new Phaser.Geom.Rectangle(
            this.player.x - 6,
            this.player.y + 3,
            12,
            9
        );
        const blacksmithBounds = new Phaser.Geom.Rectangle(
            this.fugitiveBlacksmith.x - 12,
            this.fugitiveBlacksmith.y - 24,
            24,
            32
        );

        if (!Phaser.Geom.Intersects.RectangleToRectangle(playerFeet, blacksmithBounds)) {
            return false;
        }

        this.showFugitiveEncounter();
        return true;
    }

    checkCaseComplete() {
        if (
            !this.houseDialogueState.caseCompletePending ||
            this.houseDialogueState.caseCompleteShown ||
            !this.caseCompleteStartPosition
        ) {
            return false;
        }

        const distanceWalked = Phaser.Math.Distance.Between(
            this.caseCompleteStartPosition.x,
            this.caseCompleteStartPosition.y,
            this.player.x,
            this.player.y
        );

        if (distanceWalked < 32) {
            return false;
        }

        this.showCaseCompleteDialogue();
        return true;
    }

    reportDoorContacts() {
        this.frameDoorContacts.forEach((doorId) => {
            if (!this.activeDoorContacts.has(doorId)) {
                const door = this.doorTriggers.find((entry) => entry.id === doorId);
                this.openDialogue(door);
            }
        });

        this.activeDoorContacts = this.frameDoorContacts;
    }

    addCollisionObjects(originX, originY, objects) {
        objects.forEach((object) => {
            const shape = this.getCollisionShape(originX, originY, object);

            if (!shape) {
                return;
            }

            this.collisionShapes.push(shape);
        });
    }

    getCollisionShape(originX, originY, object) {
        if (!object.polygon) {
            if (object.width <= 0 || object.height <= 0) {
                return null;
            }

            return {
                type: "rectangle",
                x: originX + object.x,
                y: originY + object.y,
                width: object.width,
                height: object.height
            };
        }

        return {
            type: "polygon",
            points: object.polygon.map((point) => ({
                x: originX + object.x + point.x,
                y: originY + object.y + point.y
            }))
        };
    }

    findBottomRightSpawn(worldWidth, worldHeight) {
        const margin = 24;
        const step = 16;

        for (let y = worldHeight - margin; y >= margin; y -= step) {
            for (let x = worldWidth - margin; x >= margin; x -= step) {
                if (!this.playerCollidesAt(x, y)) {
                    return { x, y };
                }
            }
        }

        return { x: worldWidth / 2, y: worldHeight / 2 };
    }

    findNearestSpawn(preferredX, preferredY, worldWidth, worldHeight) {
        const step = 8;
        const maxRadius = 96;
        const clampedX = Phaser.Math.Clamp(preferredX, 12, worldWidth - 12);
        const clampedY = Phaser.Math.Clamp(preferredY, 12, worldHeight - 12);

        if (!this.playerCollidesAt(clampedX, clampedY)) {
            return { x: clampedX, y: clampedY };
        }

        for (let radius = step; radius <= maxRadius; radius += step) {
            for (let offsetX = -radius; offsetX <= radius; offsetX += step) {
                const candidates = [
                    { x: clampedX + offsetX, y: clampedY - radius },
                    { x: clampedX + offsetX, y: clampedY + radius }
                ];

                for (const candidate of candidates) {
                    if (
                        candidate.x >= 12 &&
                        candidate.x <= worldWidth - 12 &&
                        candidate.y >= 12 &&
                        candidate.y <= worldHeight - 12 &&
                        !this.playerCollidesAt(candidate.x, candidate.y)
                    ) {
                        return candidate;
                    }
                }
            }

            for (let offsetY = -radius + step; offsetY < radius; offsetY += step) {
                const candidates = [
                    { x: clampedX - radius, y: clampedY + offsetY },
                    { x: clampedX + radius, y: clampedY + offsetY }
                ];

                for (const candidate of candidates) {
                    if (
                        candidate.x >= 12 &&
                        candidate.x <= worldWidth - 12 &&
                        candidate.y >= 12 &&
                        candidate.y <= worldHeight - 12 &&
                        !this.playerCollidesAt(candidate.x, candidate.y)
                    ) {
                        return candidate;
                    }
                }
            }
        }

        return this.findBottomRightSpawn(worldWidth, worldHeight);
    }

    movePlayer(deltaX, deltaY) {
        const startX = this.player.x;
        const startY = this.player.y;
        const minX = this.player.width / 2;
        const maxX = this.physics.world.bounds.width - this.player.width / 2;
        const minY = this.player.height / 2;
        const maxY = this.physics.world.bounds.height - this.player.height / 2;

        if (deltaX !== 0) {
            const nextX = Phaser.Math.Clamp(this.player.x + deltaX, minX, maxX);
            this.collectDoorContactsAt(nextX, this.player.y);

            if (!this.playerCollidesAt(nextX, this.player.y)) {
                this.player.x = nextX;
            }
        }

        if (deltaY !== 0) {
            const nextY = Phaser.Math.Clamp(this.player.y + deltaY, minY, maxY);
            this.collectDoorContactsAt(this.player.x, nextY);

            if (!this.playerCollidesAt(this.player.x, nextY)) {
                this.player.y = nextY;
            }
        }

        this.player.body.reset(this.player.x, this.player.y);

        return {
            x: this.player.x - startX,
            y: this.player.y - startY
        };
    }

    playerCollidesAt(x, y) {
        const footBox = new Phaser.Geom.Rectangle(x - 6, y + 3, 12, 9);

        return this.collisionShapes.some((shape) => {
            if (shape.type === "rectangle") {
                return !(
                    footBox.right < shape.x ||
                    footBox.bottom < shape.y ||
                    footBox.x > shape.x + shape.width ||
                    footBox.y > shape.y + shape.height
                );
            }

            return this.rectangleIntersectsPolygon(footBox, shape.points);
        });
    }

    rectangleIntersectsPolygon(rectangle, points) {
        const corners = [
            { x: rectangle.x, y: rectangle.y },
            { x: rectangle.x + rectangle.width, y: rectangle.y },
            { x: rectangle.x + rectangle.width, y: rectangle.y + rectangle.height },
            { x: rectangle.x, y: rectangle.y + rectangle.height }
        ];

        if (corners.some((point) => this.pointInPolygon(point, points))) {
            return true;
        }

        if (points.some((point) => Phaser.Geom.Rectangle.Contains(rectangle, point.x, point.y))) {
            return true;
        }

        for (let i = 0; i < points.length; i++) {
            const polygonStart = points[i];
            const polygonEnd = points[(i + 1) % points.length];

            for (let j = 0; j < corners.length; j++) {
                const rectangleStart = corners[j];
                const rectangleEnd = corners[(j + 1) % corners.length];

                if (Phaser.Geom.Intersects.LineToLine(
                    new Phaser.Geom.Line(polygonStart.x, polygonStart.y, polygonEnd.x, polygonEnd.y),
                    new Phaser.Geom.Line(rectangleStart.x, rectangleStart.y, rectangleEnd.x, rectangleEnd.y)
                )) {
                    return true;
                }
            }
        }

        return false;
    }

    pointInPolygon(point, polygon) {
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const current = polygon[i];
            const previous = polygon[j];
            const crosses = (current.y > point.y) !== (previous.y > point.y)
                && point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;

            if (crosses) {
                inside = !inside;
            }
        }

        return inside;
    }
}
