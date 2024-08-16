import Phaser from "phaser";
import { Player, Enemy } from "./lib/gameObjects";
import fileList from "../public/assets/music/_fileList.json";

/**
 * Given the track seconds, format it as minutes:seconds with padded 0 when necessary
 * @param seconds number
 * @returns string
 */
function formatTrackDuration(totalSeconds) {
    let minutes = Math.floor(totalSeconds / 60);
    let remainingSeconds = Math.floor(totalSeconds % 60);

    // pad minutes and seconds
    minutes = minutes < 10 ? "0" + minutes : minutes;
    remainingSeconds =
        remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;

    return `${minutes}:${remainingSeconds}`;
}

// enums
const Color = { WHITE: 0xffffff, BLACK: 0x000000, GRAY: 0xcccccc };

// scene
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: "main" });
    }

    preload() {
        this.load.image("bg", "assets/environment/back.png");

        this.trackList = fileList;

        this.trackList.forEach((trackName) => {
            this.load.audio(trackName, `assets/music/${trackName}`);
        });

        this.load.atlas(
            "atlas",
            "assets/atlas/atlas.png",
            "assets/atlas/atlas.json",
        );

        this.load.svg(
            "skip_backward",
            "assets/icons/skip-backward-circle-fill.svg",
            { width: 50, height: 50 },
        );

        this.load.svg(
            "skip_forward",
            "assets/icons/skip-forward-circle-fill.svg",
            { width: 50, height: 50 },
        );

        this.load.svg("play", "assets/icons/play-circle-fill.svg", {
            width: 50,
            height: 50,
        });

        this.load.svg("pause", "assets/icons/pause-circle-fill.svg", {
            width: 50,
            height: 50,
        });
    }

    create() {
        this.gameStarted = false;
        this.objectScale = 2.5;

        this.sound.setVolume(0.5);

        this.screenSize = {
            width: this.sys.game.config.width,
            height: this.sys.game.config.height,
        };

        this.add
            .image(this.screenSize.width / 2, this.screenSize.height / 2, "bg")
            .setScale(this.objectScale);

        this.createAnims();
        this.initWorld();
        this.setupUI();
        this.initAudio();

        this.time.addEvent({
            delay: 1_000,
            callback: this.updateTrackTime,
            callbackScope: this,
            loop: true,
        });

        this.progressCollider = this.add.rectangle(
            this.progressBarX,
            this.progressBarY,
            0,
            this.progressBarHeight,
        );
        this.physics.add.existing(this.progressCollider);

        // Update the progress bar every frame
        this.time.addEvent({
            delay: 50, // Update more frequently for smoother animation
            callback: this.updateProgressBar,
            callbackScope: this,
            loop: true,
        });
    }

    update() {
        /*
        if (this.cursors.left.isDown) {
            this.player.moveLeft();
        } else if (this.cursors.right.isDown) {
            this.player.moveRight();
        } else {
            this.player.stopMoving();
        }

        if (this.cursors.up.isDown) {
            this.player.jump();
        } else if (this.cursors.down.isDown) {
            this.player.crouch();
        }
            */
    }

    updateProgressBar() {
        if (!this.gameStarted) return;

        if (this.music.isPlaying) {
            // Calculate the progress of the track
            let progress = this.music.seek / this.music.duration;

            // Clear the previous fill and redraw it with the updated width
            this.progressFill.clear();
            this.progressFill.fillStyle(Color.WHITE);
            this.progressFill.fillRect(
                this.progressBarX,
                this.progressBarY,
                this.progressBarWidth * progress,
                this.progressBarHeight,
            );
        }
    }

    selectTrack(trackIndex) {
        const trackName = this.trackList[trackIndex];
        this.updateTrackTitle(trackName);
        this.currentSongIndex = trackIndex;
        this.music = this.sound.add(trackName);

        this.trackTotalTimeText.setText(
            formatTrackDuration(this.music.duration),
        );

        this.updateTrackTime();

        this.music.once("complete", () => {
            this.playNextSong();
        });
    }

    playPreviousSong() {
        if (!this.gameStarted || !this.music) return;

        this.music.stop();

        // just play from the start if it's the first track
        if (this.currentSongIndex === 0) {
            this.music.play();
        } else {
            this.currentSongIndex--;
            this.selectTrack(this.currentSongIndex);
            this.music.play();
        }
    }

    playNextSong() {
        if (!this.gameStarted || !this.music) return;

        this.music.stop();

        if (this.currentSongIndex === this.trackList.length - 1) {
            this.selectTrack(0);
            this.playButton.setTexture("play");
        } else {
            this.currentSongIndex++;
            this.selectTrack(this.currentSongIndex);
            this.music.play();
            this.playButton.setTexture("pause");
        }
    }

    /**
     * This is the seek bar working as a platform for the player to stand uppon it
     */
    createPlatform() {
        this.progressBarWidth = this.screenSize.width * 0.7;
        this.progressBarHeight = 10;
        this.progressBarX = this.screenSize.width * 0.15;
        this.progressBarY = this.screenSize.height * 0.77;

        this.platformGroup = this.physics.add.staticGroup();

        const rectangle = this.add
            .rectangle(
                this.progressBarX,
                this.progressBarY,
                this.progressBarWidth,
                this.progressBarHeight,
                Color.BLACK,
                0.3,
            )
            .setOrigin(0)
            .setInteractive()
            .on(
                "pointerup",
                (pointer) => {
                    this.seekMusic(pointer);
                },
                this,
            );
        this.platform = this.platformGroup.add(rectangle);
    }

    createPlayer() {
        // player Object
        this.playerGroup = this.physics.add.group({
            calssType: Player,
            gravityY: 300,
            runChildUpdate: true,
            collideWorldBounds: true,
        });

        this.player = new Player(
            this,
            this.progressBarX + 20,
            this.screenSize.height * 0.3,
        ).setScale(this.objectScale);

        this.playerGroup.add(this.player);

        //this.player.y = 0;
        this.player.anims.play("idle");

        this.player.body.onWorldBounds = true;

        this.physics.world.on("worldbounds", (body, up, down, left, right) => {
            if (body.gameObject === this.player && down) {
                this.restartMusic();
                this.player.respawn();
            }
        });
    }

    createEnemies() {
        this.enemyGroup = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true,
        });

        // spawn enemy
        this.enemyGroup.create(
            this.screenSize.width + this.screenSize.width * 0.25,
            this.screenSize.height * 0.65,
            this.objectScale,
        );
    }

    addColliders() {
        this.physics.add.collider(this.playerGroup, this.platformGroup);

        this.physics.add.overlap(
            this.playerGroup,
            this.enemyGroup,
            this.onEnemyCollision,
            null,
            this,
        );
    }

    onEnemyCollision(player, enemy) {
        if (player.isCrouching) return;

        if (!player.body.touching.down) {
            enemy.hit();
        } else {
            enemy.hit();
            player.push(enemy.direction);
        }
    }

    initWorld() {
        this.createPlatform();
        this.createPlayer();
        this.createEnemies();
        this.addColliders();
        this.addControls();
    }

    updateTrackTime() {
        if (this.music && this.music.isPlaying) {
            // audio current time in seconds
            const currentTime = this.music.seek;
            this.trackTimeText.setText(formatTrackDuration(currentTime));
        }
    }

    toggleMusic() {
        // init audio first time pressing play
        if (!this.gameStarted) {
            if (this.trackList.length === 0) {
                this.updateTrackTitle("No track found.");
            } else {
                this.gameStarted = true;
                this.selectTrack(0);
                this.playButton.setTexture("pause");
                this.music.play();
            }
        } else {
            if (this.music.isPlaying) {
                this.music.pause();
                this.playButton.setTexture("play");
            } else {
                this.music.resume();
                this.playButton.setTexture("pause");
            }
        }
    }

    seekMusic(pointer) {
        const relativeX = pointer.x - this.progressBarX;
        const progress = Phaser.Math.Clamp(
            relativeX,
            this.progressBarWidth,
            0,
            1,
        );
        this.music.seek = progress * this.music.duration;
    }

    createAnims() {
        this.anims.create({
            key: "hurt",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "player/hurt/player-hurt-",
                start: 1,
                end: 2,
            }),
            frameRate: 4,
            repeat: -1,
        });

        this.anims.create({
            key: "idle",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "player/idle/player-idle-",
                start: 1,
                end: 4,
            }),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: "crouch",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "player/crouch/player-crouch-",
                start: 1,
                end: 2,
            }),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: "run",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "player/run/player-run-",
                start: 1,
                end: 6,
            }),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: "eagle-attack",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "eagle/eagle-attack-",
                start: 1,
                end: 4,
            }),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: "enemy-death",
            frames: this.anims.generateFrameNames("atlas", {
                prefix: "enemy-death/enemy-death-",
                start: 2,
                end: 6,
            }),
            frameRate: 10,
            repeat: 0,
        });
    }

    setupUI() {
        this.trackTitleText = this.add
            .text(
                this.screenSize.width * 0.5,
                this.screenSize.height * 0.35,
                "Loading...",
                { fontSize: `${this.screenSize.width * 0.02}px` },
            )
            .setOrigin(0.5)
            .setDepth(5);

        const padding = 20;
        const panelWidth = this.trackTitleText.width + padding * 8;
        const panelHeight = this.trackTitleText.height + padding * 2;

        this.panel = this.add.graphics();

        this.panel.fillStyle(Color.BLACK, 0.5);
        this.panel.fillRoundedRect(
            this.trackTitleText.x - panelWidth / 2,
            this.trackTitleText.y - panelHeight / 2,
            panelWidth,
            panelHeight,
            16, // Corner radius
        );

        // Ensure the panel is behind the text
        this.panel.setDepth(this.trackTitleText.depth - 1);

        const trackTimePosY = this.screenSize.height * 0.8;
        const trackTimeFontStyle = {
            fontSize: `${this.screenSize.width * 0.03}px`,
            fill: "aliceblue",
        };

        this.trackTimeText = this.add.text(
            this.screenSize.width * 0.15,
            trackTimePosY,
            "00:00",
            trackTimeFontStyle,
        );

        this.trackTotalTimeText = this.add.text(
            this.screenSize.width * 0.76,
            trackTimePosY,
            "00:00",
            trackTimeFontStyle,
        );

        // borders
        this.progressBorder = this.add.graphics();
        this.progressBorder.lineStyle(2, 0x000000);
        this.progressBorder.strokeRect(
            this.progressBarX,
            this.progressBarY,
            this.progressBarWidth,
            this.progressBarHeight,
        );

        // Create the fill of the progress bar
        this.progressFill = this.add.graphics();

        // buttons
        const buttonPosY = this.screenSize.height * 0.9;
        this.previousButton = this.add
            .image(this.screenSize.width * 0.35, buttonPosY, "skip_backward")
            .setInteractive()
            .on(
                "pointerdown",
                () => {
                    this.previousButton.setTint(Color.GRAY);
                    this.playPreviousSong();
                },
                this,
            )
            .on(
                "pointerup",
                () => {
                    this.previousButton.clearTint();
                },
                this,
            );

        this.playButton = this.add
            .image(this.screenSize.width * 0.5, buttonPosY, "play")
            .setOrigin(0.5)
            .setScale(1.5)

            .setInteractive()
            .on(
                "pointerdown",
                () => {
                    this.playButton.setTint(Color.GRAY);
                    this.toggleMusic();
                },
                this,
            )
            .on(
                "pointerup",
                function () {
                    this.playButton.clearTint();
                },
                this,
            );

        this.nextButton = this.add
            .image(this.screenSize.width * 0.65, buttonPosY, "skip_forward")
            .setInteractive()
            .on(
                "pointerdown",
                () => {
                    this.nextButton.setTint(Color.GRAY);
                    this.playNextSong();
                },
                this,
            )
            .on(
                "pointerup",
                () => {
                    this.nextButton.clearTint();
                },
                this,
            );
    }

    updateTrackTitle(trackName) {
        this.trackTitleText.setText(trackName);
        this.panel.clear();

        const padding = 20;
        const panelWidth = this.trackTitleText.width + padding * 8;
        const panelHeight = this.trackTitleText.height + padding * 2;

        this.panel.fillStyle(Color.BLACK, 0.5);
        this.panel.fillRoundedRect(
            this.trackTitleText.x - panelWidth / 2,
            this.trackTitleText.y - panelHeight / 2,
            panelWidth,
            panelHeight,
            16, // Corner radius
        );
    }

    addControls() {
        this.input.keyboard.on("keydown-A", (event) => {
            if (this.player.isBeingPushed) return;

            this.player.moveLeft();
        });

        this.input.keyboard.on("keyup-A", (event) => {
            if (this.player.isBeingPushed) return;

            this.player.stopMoving();
        });

        this.input.keyboard.on("keydown-D", (event) => {
            if (this.player.isBeingPushed) return;

            this.player.moveRight();
        });

        this.input.keyboard.on("keyup-D", (event) => {
            if (this.player.isBeingPushed) return;

            this.player.stopMoving();
        });

        this.input.keyboard.on("keydown-W", (event) => {
            if (this.player.isBeingPushed || !this.player.body.touching.down)
                return;

            this.player.jump();
        });

        this.input.keyboard.on("keydown-S", (event) => {
            if (this.player.isBeingPushed || !this.player.body.touching.down)
                return;

            this.player.crouch();
        });

        this.input.keyboard.on("keyup-S", (event) => {
            if (this.player.isBeingPushed) return;

            this.player.stopMoving();
        });
    }

    initAudio() {
        this.music = null;
        this.currentSongIndex = 0;

        if (this.trackList.length === 0) {
            this.updateTrackTitle("No track found.");
        } else {
            this.selectTrack(this.currentSongIndex);
        }
    }

    restartMusic() {
        if (!this.music || !this.gameStarted) return;

        this.music.stop();
        this.music.play();
        this.playButton.setTexture("pause");
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    pixelArt: true,
    parent: "game-container",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    scene: [MainScene],
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 300 },
            debug: false,
        },
    },
    autoRound: false,
};

new Phaser.Game(config);
