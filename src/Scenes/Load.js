class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.add.text(16, 16, "Loading tilemap...", { font: "18px Arial", fill: "#ffffff" });

        this.load.tilemapTiledJSON("levelMap", "assets/PrimValley.tmj");
        this.load.image("travelBookPopup", "assets/UI_TravelBook_Popup01a.png");
        this.load.image("characters", "assets/character_9-16.png");
        this.load.image("bookCover", "assets/bookcover.png");
        this.load.image("pageLeft", "assets/pageleft.png");
        this.load.image("pageRight", "assets/pageright.png");

        // Loads the map's tile information and the images that go with it.
        TILESET_SOURCES.forEach((tileset) => {
            this.load.text(tileset.key, tileset.tsx);

            if (tileset.image) {
                this.load.spritesheet(tileset.name, tileset.image, {
                    frameWidth: tileset.frameWidth || 16,
                    frameHeight: tileset.frameHeight || 16
                });
            }
        });

        IMAGE_COLLECTIONS.forEach((image) => {
            this.load.image(image.key, image.path);
        });

        // Loads every shadow image that may appear on the map.
        ["Round", "Sqare"].forEach((shape) => {
            ["16x16", "16x32", "24x24", "24x48", "32x16", "32x32", "40x40", "48x24", "48x48"].forEach((size) => {
                ["Flat", "Short", "Medium", "Long"].forEach((shadowLength) => {
                    const path = `assets/Art/Shadows/Shadow_${shape}_${size}_${shadowLength}_Black.png`;
                    this.load.image(path, path);
                });
            });
        });
    }

    create() {
        this.scene.start("titleScene");
    }
}

const TILESET_SOURCES = [
    {
        name: "Atlas_Buildings",
        key: "tsx_Atlas_Buildings",
        tsx: "assets/Tiled/Tilesets/Atlas_Buildings.tsx",
        image: "assets/Art/Buildings/Atlas/Buildings.png"
    },
    {
        name: "Atlas_Props",
        key: "tsx_Atlas_Props",
        tsx: "assets/Tiled/Tilesets/Atlas_Props.tsx",
        image: "assets/Art/Props/Atlas/Props.png"
    },
    {
        name: "Atlas_Rocks",
        key: "tsx_Atlas_Rocks",
        tsx: "assets/Tiled/Tilesets/Atlas_Rocks.tsx",
        image: "assets/Art/Rocks/Atlas/Rocks.png"
    },
    {
        name: "Tileset_Ground",
        key: "tsx_Tileset_Ground",
        tsx: "assets/Tiled/Tilesets/Tileset_Ground.tsx",
        image: "assets/Art/Ground Tileset/Tileset_Ground.png"
    },
    {
        name: "Tileset_RockSlope",
        key: "tsx_Tileset_RockSlope",
        tsx: "assets/Tiled/Tilesets/Tileset_RockSlope.tsx",
        image: "assets/Art/Rock Slopes/Tileset_RockSlope.png"
    },
    {
        name: "Tileset_RockSlope_Simple",
        key: "tsx_Tileset_RockSlope_Simple",
        tsx: "assets/Tiled/Tilesets/Tileset_RockSlope_Simple.tsx",
        image: "assets/Art/Rock Slopes/Tileset_RockSlope_Simple.png"
    },
    {
        name: "Tileset_Water",
        key: "tsx_Tileset_Water",
        tsx: "assets/Tiled/Tilesets/Tileset_Water.tsx",
        image: "assets/Art/Water and Sand/Tileset_Water.png"
    },
    {
        name: "Tilesets_Road",
        key: "tsx_Tilesets_Road",
        tsx: "assets/Tiled/Tilesets/Tilesets_Road.tsx",
        image: "assets/Art/Ground Tileset/Tileset_Road.png"
    },
    {
        name: "Atlas_Trees_Bushes",
        key: "tsx_Atlas_Trees_Bushes",
        tsx: "assets/Tiled/Tilesets/Atlas_Trees_Bushes.tsx",
        image: "assets/Art/Trees and Bushes/Atlas/Trees_Bushes.png"
    },
    {
        name: "Animation_Flowers_Red",
        key: "tsx_Animation_Flowers_Red",
        tsx: "assets/Tiled/Tilesets/Animation_Flowers_Red.tsx",
        image: "assets/Art/Props/Animation/Flowers_Red.png"
    },
    {
        name: "Animation_Flowers_White",
        key: "tsx_Animation_Flowers_White",
        tsx: "assets/Tiled/Tilesets/Animation_Flowers_White.tsx",
        image: "assets/Art/Props/Animation/Flowers_White.png"
    },
    {
        name: "Animation_Campfire",
        key: "tsx_Animation_Campfire",
        tsx: "assets/Tiled/Tilesets/Animation_Campfire.tsx",
        image: "assets/Art/Props/Animation/Animation_Campfire.png"
    },
    {
        name: "Tileset_Shadow",
        key: "tsx_Tileset_Shadow",
        tsx: "assets/Tiled/Tilesets/Tileset_Shadow.tsx",
        image: "assets/Art/Shadows/Atlas/Tileset_Shadow.png"
    },
    { name: "Buildings", key: "tsx_Objects_Buildings", tsx: "assets/Tiled/Tilesets/Objects_Buildings.tsx" },
    { name: "Objects_Props", key: "tsx_Objects_Props", tsx: "assets/Tiled/Tilesets/Objects_Props.tsx" },
    { name: "Objects_Rocks", key: "tsx_Objects_Rocks", tsx: "assets/Tiled/Tilesets/Objects_Rocks.tsx" },
    { name: "Objects_Trees", key: "tsx_Objects_Trees", tsx: "assets/Tiled/Tilesets/Objects_Trees.tsx" },
    { name: "Objects_Shadows", key: "tsx_Objects_Shadows", tsx: "assets/Tiled/Tilesets/Objects_Shadows.tsx" },
    {
        name: "automap-tiles",
        key: "tsx_automap_tiles",
        tsx: "assets/Tiled/Tilesets/automap-tiles.tsx",
        image: "assets/Art/Ground Tileset/Tileset_Ground.png"
    }
];

const IMAGE_COLLECTIONS = [
    { key: "assets/Art/Buildings/House_Hay_1.png", path: "assets/Art/Buildings/House_Hay_1.png" },
    { key: "assets/Art/Buildings/House_Hay_2.png", path: "assets/Art/Buildings/House_Hay_2.png" },
    { key: "assets/Art/Buildings/House_Hay_3.png", path: "assets/Art/Buildings/House_Hay_3.png" },
    { key: "assets/Art/Buildings/House_Hay_4_Purple.png", path: "assets/Art/Buildings/House_Hay_4_Purple.png" },
    { key: "assets/Art/Buildings/CityWall_Gate_1.png", path: "assets/Art/Buildings/CityWall_Gate_1.png" },
    { key: "assets/Art/Buildings/Well_Hay_1.png", path: "assets/Art/Buildings/Well_Hay_1.png" },
    { key: "assets/Art/Props/Table_Medium_1.png", path: "assets/Art/Props/Table_Medium_1.png" },
    { key: "assets/Art/Props/Sign_2.png", path: "assets/Art/Props/Sign_2.png" },
    { key: "assets/Art/Props/Sign_1.png", path: "assets/Art/Props/Sign_1.png" },
    { key: "assets/Art/Props/Sack_3.png", path: "assets/Art/Props/Sack_3.png" },
    { key: "assets/Art/Props/Plant_2.png", path: "assets/Art/Props/Plant_2.png" },
    { key: "assets/Art/Props/LampPost_3.png", path: "assets/Art/Props/LampPost_3.png" },
    { key: "assets/Art/Props/HayStack_2.png", path: "assets/Art/Props/HayStack_2.png" },
    { key: "assets/Art/Props/Fireplace_1.png", path: "assets/Art/Props/Fireplace_1.png" },
    { key: "assets/Art/Props/Crate_Water_1.png", path: "assets/Art/Props/Crate_Water_1.png" },
    { key: "assets/Art/Props/Crate_Medium_Closed.png", path: "assets/Art/Props/Crate_Medium_Closed.png" },
    { key: "assets/Art/Props/Crate_Large_Empty.png", path: "assets/Art/Props/Crate_Large_Empty.png" },
    { key: "assets/Art/Props/Chopped_Tree_1.png", path: "assets/Art/Props/Chopped_Tree_1.png" },
    { key: "assets/Art/Props/BulletinBoard_1.png", path: "assets/Art/Props/BulletinBoard_1.png" },
    { key: "assets/Art/Props/Bench_3.png", path: "assets/Art/Props/Bench_3.png" },
    { key: "assets/Art/Props/Bench_1.png", path: "assets/Art/Props/Bench_1.png" },
    { key: "assets/Art/Props/Basket_Empty.png", path: "assets/Art/Props/Basket_Empty.png" },
    { key: "assets/Art/Props/Barrel_Small_Empty.png", path: "assets/Art/Props/Barrel_Small_Empty.png" },
    { key: "assets/Art/Props/Banner_Stick_1_Purple.png", path: "assets/Art/Props/Banner_Stick_1_Purple.png" },
    { key: "assets/Art/Rocks/Rock_Brown_1.png", path: "assets/Art/Rocks/Rock_Brown_1.png" },
    { key: "assets/Art/Rocks/Rock_Brown_2.png", path: "assets/Art/Rocks/Rock_Brown_2.png" },
    { key: "assets/Art/Rocks/Rock_Brown_4.png", path: "assets/Art/Rocks/Rock_Brown_4.png" },
    { key: "assets/Art/Rocks/Rock_Brown_6.png", path: "assets/Art/Rocks/Rock_Brown_6.png" },
    { key: "assets/Art/Rocks/Rock_Brown_9.png", path: "assets/Art/Rocks/Rock_Brown_9.png" },
    { key: "assets/Art/Trees and Bushes/Bush_Emerald_1.png", path: "assets/Art/Trees and Bushes/Bush_Emerald_1.png" },
    { key: "assets/Art/Trees and Bushes/Bush_Emerald_2.png", path: "assets/Art/Trees and Bushes/Bush_Emerald_2.png" },
    { key: "assets/Art/Trees and Bushes/Bush_Emerald_3.png", path: "assets/Art/Trees and Bushes/Bush_Emerald_3.png" },
    { key: "assets/Art/Trees and Bushes/Bush_Emerald_4.png", path: "assets/Art/Trees and Bushes/Bush_Emerald_4.png" },
    { key: "assets/Art/Trees and Bushes/Bush_Emerald_5.png", path: "assets/Art/Trees and Bushes/Bush_Emerald_5.png" },
    { key: "assets/Art/Trees and Bushes/Bush_Emerald_6.png", path: "assets/Art/Trees and Bushes/Bush_Emerald_6.png" },
    { key: "assets/Art/Trees and Bushes/Bush_Emerald_7.png", path: "assets/Art/Trees and Bushes/Bush_Emerald_7.png" },
    { key: "assets/Art/Trees and Bushes/Tree_Emerald_1.png", path: "assets/Art/Trees and Bushes/Tree_Emerald_1.png" },
    { key: "assets/Art/Trees and Bushes/Tree_Emerald_2.png", path: "assets/Art/Trees and Bushes/Tree_Emerald_2.png" },
    { key: "assets/Art/Trees and Bushes/Tree_Emerald_3.png", path: "assets/Art/Trees and Bushes/Tree_Emerald_3.png" },
    { key: "assets/Art/Trees and Bushes/Tree_Emerald_4.png", path: "assets/Art/Trees and Bushes/Tree_Emerald_4.png" }
];
