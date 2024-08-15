import Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, "atlas", "player/idle/player-idle-1");
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.moveSpeed = 100;
        this.isBeingPushed = false;
        this.isCrouching = false;

        this.initialPosX = x;
        this.initialPosY = y;
    }

    update() {
        //console.log("Im running!");
    }

    moveLeft() {
        this.setVelocityX(-this.moveSpeed);
        this.flipX = true;
        this.anims.play("run", true);
    }

    moveRight() {
        this.setVelocityX(this.moveSpeed);
        this.flipX = false;
        this.anims.play("run", true);
    }

    push(direction) {
        this.anims.play("hurt", true);
        this.setVelocityX(direction * this.moveSpeed * 2);
        this.isBeingPushed = true;
    }

    jump() {
        this.setVelocityY(-400);
    }

    crouch() {
        this.anims.play("crouch", true);
        this.isCrouching = true;
    }

    stopMoving() {
        this.setVelocityX(0);
        this.anims.play("idle", true);
        this.isCrouching = false;
    }

    respawn() {
        this.isBeingPushed = false;
        this.isCrouching = false;

        this.x = this.initialPosX;
        this.y = this.initialPosY;

        this.stopMoving();

        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 200,
            ease: "Linear",
            yoyo: true,
            repeat: 5,
            onComplete: () => {},
        });
    }
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, scale) {
        super(scene, x, y, "atlas", "eagle/eagle-attack-1");
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.scene = scene;
        this.setScale(scale);
        this.setDepth(15);

        this.anims.play("eagle-attack", true);

        this.moveSpeed = 100;

        this.initialPosX = x;
        this.initialPosY = y;

        this.direction = -1;

        const screenWidth = scene.screenSize.width;

        this.leftBound = 0 - screenWidth * 0.25;
        this.rightBound = screenWidth + screenWidth * 0.25;

        scene.tweens.add({
            targets: this,
            y: this.y - 20,
            duration: 1500,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1,
        });

        scene.events.once("update", () => {
            this.body.setAllowGravity(false);
            this.moveLeft();
        });

        this.on("animationcomplete", this.onAnimationComplete, this);
    }

    update() {
        if (!this.scene.gameStarted || !this.body) return;

        if (this.body.x < this.leftBound) {
            this.moveRight();
        }

        if (this.body.x > this.rightBound) {
            this.moveLeft();
        }

        this.moveSpeed = this.direction * this.scene.music.seek * 10;
        this.setVelocityX(this.moveSpeed);
    }

    onAnimationComplete(anim) {
        if (anim.key === "enemy-death") {
            this.anims.play("eagle-attack", true);
            this.respawn();
        }
    }

    hit() {
        //this.anims.play("enemy-death");
        this.x = this.x + 5 * this.direction;
        this.stopMoving();
        this.anims.play("enemy-death", true);
    }

    moveLeft() {
        this.direction = -1;
        this.flipX = this.direction > 0;
    }

    moveRight() {
        this.direction = 1;
        this.flipX = this.direction > 0;
    }

    flipDirection() {
        this.direction *= -1;

        this.x += this.direction * this.scene.screenSize.width * 0.15;

        if (this.direction < 0) {
            this.moveRight();
        } else {
            this.moveLeft();
        }
    }

    stopMoving() {
        this.body.setVelocityX(0);
    }

    respawn() {
        this.x = this.initialPosX;
        this.y = this.initialPosY;

        this.moveSpeed = 0;

        const spawnDelay = Phaser.Math.Between(5000, 15000);
        this.scene.time.delayedCall(
            spawnDelay,
            () => {
                this.moveLeft();
                this.anims.play("eagle-attack", true);
            },
            [],
            this,
        );
    }
}
