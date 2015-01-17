/*globals CONFIG */

var foo = CONFIG.GAME_HEIGHT - CONFIG.WORLD_HEIGHT * 14;
foo = - 800;

(function() {
	'use strict';


	/************************************************************************************************
	 * ACTOR CLASS
	 * 
	 * Direct child from Phaser.Sprite class
	 * Set basic parameters common to all prites on screen
	 *
	 ************************************************************************************************/


	function Actor(state, image) {

		this.state = state;
		this.game = state.game;

		// Call parent constructor
		Phaser.Sprite.call(this, this.game, 0, 0, image);
		// Add the object to the game world
		this.game.add.existing(this);

		// Pure common things to ALL actor abjects
		this.anchor.setTo(0.5, 0.5);
		this.scale.setTo(CONFIG.PIXEL_RATIO, CONFIG.PIXEL_RATIO);
		this.game.physics.enable(this, Phaser.Physics.ARCADE);
	}

	Actor.prototype = Object.create(Phaser.Sprite.prototype);
	Actor.prototype.constructor = Actor;


	/************************************************************************************************
	 * COLLECTIBLE CLASS
	 * 
	 * Can be picked
	 *
	 ************************************************************************************************/

	function Collectible(state, image) {

		// Call parent constructor
		Actor.call(this, state, image);
	
		this.alive = true;
		this.updateClass();
	}

	Collectible.prototype = Object.create(Actor.prototype);
	Collectible.prototype.constructor = Collectible;

	Collectible.prototype.update = function () {

		// Call parent update function
		Actor.prototype.update.call(this);

		// Kill mob if below the screen
		if (this.y > CONFIG.GAME_HEIGHT * CONFIG.PIXEL_RATIO + 200) {
			this.kill();
			return;
		}

	};

	Collectible.prototype.updateClass = function () {

		this.bonusClass = this.state.rnd.integerInRange(0, 3);

		// Ugly hack to skip the last spritesheet row (4 instead of 3)
		var fakeClass = this.bonusClass;
		if (fakeClass === 3) fakeClass = 4;

		var offset = fakeClass * 3;

		this.animations.add('idle', [0 + offset, 1 + offset, 2 + offset, 1 + offset], 15, true);
		this.play('idle');
	};


	/************************************************************************************************
	 * MOB CLASS
	 * 
	 * Have health, can take damage and die
	 * Parent of both player and enemies
	 *
	 ************************************************************************************************/

	function Mob(state, image) {

		// Call parent constructor
		Actor.call(this, state, image);
	
		// Mob properties
		this.alive = true;
		this.health = 100;
		this.maxHealth = this.health;
		this.isDamaged = false;
		this.damageBlinkLast = 0;
		this.tint = 0xffffff;

		// this.speed = 160 * CONFIG.PIXEL_RATIO;

	}

	Mob.prototype = Object.create(Actor.prototype);
	Mob.prototype.constructor = Mob;

	Mob.prototype.update = function () {

		// Call parent update function
		Actor.prototype.update.call(this);

		// Kill mob if below the screen
		if (this.y > CONFIG.GAME_HEIGHT * CONFIG.PIXEL_RATIO + 200) {
			this.kill();
			return;
		}

		this.updateTint();
	};

	Mob.prototype.updateTint = function () {

		// Mob hit
		if (this.isDamaged) {
			this.damageBlinkLast -= 2;

			if (this.damageBlinkLast < 0) {

				this.isDamaged = false;
			}
		}

		if (this.isDamaged) {
			this.tint = 0xff0000;
		} else {
			this.tint = 0xffffff;
		}
	};

	Mob.prototype.takeDamage = function (damage) {

		this.health -= damage;

		if (this.health <= 0) {
			this.kill();

		} else {
			this.blink();
		}
	};

	Mob.prototype.blink = function () {
		this.isDamaged = true;

		this.damageBlinkLast = CONFIG.BLINK_DAMAGE_TIME;
	};

	Mob.prototype.revive = function () {
		this.health = this.maxHealth;
	};

	Mob.prototype.die = function () {
		this.kill();
	};


	/************************************************************************************************
	 * ENEMY CLASS
	 * 
	 * Like Mob, plus can shoot and loot bonuses
	 *
	 ************************************************************************************************/

	function Enemy(state, image) {

		// Call parent constructor
		Mob.call(this, state, image);

		// this.shotDelay = 100;
		this.nextShotAt = this.state.rnd.integerInRange(0, 3000);
	}

	Enemy.prototype = Object.create(Mob.prototype);
	Enemy.prototype.constructor = Enemy;

	Enemy.prototype.update = function () {

		// Call the parent update function
		Mob.prototype.update.call(this);

		// Mob shoot
		if (this.alive && this.state.player.alive && this.y < this.state.player.y - 100 * CONFIG.PIXEL_RATIO && this.state.time.now > this.nextShotAt && this.state.bulletPoolMob.countDead() > 0) {
			this.shoot();
		}
	};

	Enemy.prototype.shoot = function () {

		var bullet = this.state.bulletPoolMob.getFirstExists(false);
		bullet.reset(this.x, this.y);
		this.state.physics.arcade.moveToObject(bullet, this.state.player, 100 * CONFIG.PIXEL_RATIO);

		this.nextShotAt = this.state.time.now + this.state.rnd.integerInRange(2000, 3000);
	};

	Enemy.prototype.die = function () {

		// Call the parent die function
		Mob.prototype.die.call(this);

		if (this.state.rnd.integerInRange(0, 100) < 20) {
			this.loot();
		}
	};

	Enemy.prototype.loot = function () {

		var bonus = this.state.bonusPool.getFirstExists(false);
		bonus.updateClass();
		bonus.reset(this.x, this.y);
		bonus.body.velocity.y = 40 * CONFIG.PIXEL_RATIO;
		bonus.body.angularVelocity = 30;
	};


	/************************************************************************************************
	 * PLANE CLASS
	 * 
	 * A specific type of Enemy
	 *
	 ************************************************************************************************/

	function Plane(state) {

		// Call parent constructor
		Enemy.call(this, state, 'mob_plane');

		this.maxHealth = 30;
		this.planeClass = state.rnd.integerInRange(0, 7);

		var offset = this.planeClass * 3;
		this.animations.add('idle', [offset + 1], 5, true);
		this.animations.add('left', [offset + 0], 5, true);
		this.animations.add('right', [offset + 2], 5, true);
		this.play('idle');
	}

	Plane.prototype = Object.create(Enemy.prototype);
	Plane.prototype.constructor = Plane;

	Plane.prototype.update = function () {

		// Call the parent update function
		Enemy.prototype.update.call(this);
	};


	/************************************************************************************************
	 * VESSEL CLASS
	 * 
	 * A specific type of Enemy
	 *
	 ************************************************************************************************/

	function Vessel(state) {

		// Call parent constructor
		Enemy.call(this, state, 'mob_vessel_1');

		this.maxHealth = 100;

		this.animations.add('idle', [0], 5, true);
		this.play('idle');
	}

	Vessel.prototype = Object.create(Enemy.prototype);
	Vessel.prototype.constructor = Vessel;

	Vessel.prototype.update = function () {

		// Call the parent update function
		Enemy.prototype.update.call(this);
	};


	/************************************************************************************************
	 * PLAYER CLASS
	 * 
	 * Like a Mob, plus :
	 *   - handles user inputs
	 *   - can move with inertia
	 *   - can fire (and has its own bullet pool)
	 *
	 ************************************************************************************************/

	function Player(state) {

		this.state = state;
		this.game = state.game;

		this.playerClass = this.game.rnd.between(1, 4);
		this.playerStats = CONFIG.CLASS_STATS[this.playerClass - 1];

		// Phaser.Sprite.call(this, this.game, 0, 0, 'player_' + this.playerClass);
		Mob.call(this, state, 'player_' + this.playerClass);

		this.body.setSize(7 * CONFIG.PIXEL_RATIO, 7 * CONFIG.PIXEL_RATIO, 0, 3 * CONFIG.PIXEL_RATIO);

		this.spawn();

		this.animations.add('left_full', [ 0 ], 5, true);
		this.animations.add('left', [ 1 ], 5, true);
		this.animations.add('idle', [ 2 ], 5, true);
		this.animations.add('right', [ 3 ], 5, true);
		this.animations.add('right_full', [ 4 ], 5, true);
		this.play('idle');

		this.health = this.playerStats.health;

		this.updateStats();

		this.nextShotAt = 0;
		this.lastUpdate = 0;

		this.game.add.existing(this);

		// PLAYER BULLETS

		this.createBulletPool();
	}

	Player.prototype = Object.create(Mob.prototype);
	Player.prototype.constructor = Player;

	Player.prototype.spawn = function() {

		this.x = this.game.width / 2;
		this.y = this.game.height / 4 * 3;
	};

	Player.prototype.createBulletPool = function() {
	
		this.bulletPool = this.game.add.group();
		this.bulletPool.enableBody = true;
		this.bulletPool.physicsBodyType = Phaser.Physics.ARCADE;
		this.bulletPool.createMultiple(100, 'player_bullet');
		this.bulletPool.setAll('anchor.x', 0.5);
		this.bulletPool.setAll('anchor.y', 0.5);
		this.bulletPool.setAll('scale.x', CONFIG.PIXEL_RATIO);
		this.bulletPool.setAll('scale.y', CONFIG.PIXEL_RATIO);
		this.bulletPool.setAll('outOfBoundsKill', true);
		this.bulletPool.setAll('checkWorldBounds', true);

		this.updateBulletPool();
	};

	Player.prototype.update = function() {

		// Call the parent update function
		Mob.prototype.update.call(this);

		this.updateInputs();
		this.updateSprite();
		this.updateBullets();
	};

	Player.prototype.updateStats = function () {

		this.speed = this.playerStats.speed * CONFIG.PIXEL_RATIO;
		this.accel = this.speed * this.playerStats.accel;
		this.strength = this.playerStats.strength;
		this.shotDelay = 1000 / this.playerStats.rate;
	};

	Player.prototype.updateInputs = function () {
		// USER INPUTS

		var cursors = this.state.cursors;
		var keyboard = this.state.input.keyboard;

		var delta = (this.game.time.now - this.lastUpdate) / 1000; //in seconds
		this.lastUpdate = this.game.time.now;

		if (cursors.left.isDown && this.x > 20 * CONFIG.PIXEL_RATIO) {
			this.moveLeft(delta);
		} else if (cursors.right.isDown && this.x < (CONFIG.WORLD_WIDTH * 24 - 20) * CONFIG.PIXEL_RATIO) {
			this.moveRight(delta);
		} else {
			this.floatH(delta);
		}

		if (cursors.up.isDown && this.y > 30 * CONFIG.PIXEL_RATIO) {
			this.moveUp(delta);
		} else if (cursors.down.isDown && this.y < (CONFIG.GAME_HEIGHT - 20) * CONFIG.PIXEL_RATIO) {
			this.moveDown(delta);
		} else {
			this.floatV(delta);
		}

		if (keyboard.isDown(Phaser.Keyboard.W)) {
			this.fire();
		}
	};

	Player.prototype.updateSprite = function () {
		var spd = this.body.velocity.x;

		if (spd < - this.speed / 4 * 3) {
			this.play('left_full');
		} else if (spd > this.speed / 4 * 3) {
			this.play('right_full');
		} else if (spd < - this.speed / 5) {
			this.play('left');
		} else if (spd > this.speed / 5) {
			this.play('right');
		} else {
			this.play('idle');
		}
	};

	Player.prototype.moveLeft = function (delta) {
		this.body.velocity.x -= this.accel * delta;
		if (this.body.velocity.x < - this.speed) {
			this.body.velocity.x = - this.speed;
		}
	};

	Player.prototype.moveRight = function (delta) {
		this.body.velocity.x += this.accel * delta;
		if (this.body.velocity.x > this.speed) {
			this.body.velocity.x = this.speed;
		}
	};

	Player.prototype.moveUp = function (delta) {
		this.body.velocity.y -= this.accel * delta;
		if (this.body.velocity.y < - this.speed) {
			this.body.velocity.y = - this.speed;
		}
	};

	Player.prototype.moveDown = function (delta) {
		this.body.velocity.y += this.accel * delta;
		if (this.body.velocity.y > this.speed) {
			this.body.velocity.y = this.speed;
		}
	};

	Player.prototype.floatH = function (delta) {
		if (this.body.velocity.x > 0) {
			this.body.velocity.x -= this.accel * delta;
			if (this.body.velocity.x < 0) {
				this.body.velocity.x = 0;
			}
		} else {
			this.body.velocity.x += this.accel * delta;
			if (this.body.velocity.x > 0) {
				this.body.velocity.x = 0;
			}
		}
	};

	Player.prototype.floatV = function (delta) {
		if (this.body.velocity.y > 0) {
			this.body.velocity.y -= this.accel * delta;
			if (this.body.velocity.y < 0) {
				this.body.velocity.y = 0;
			}
		} else {
			this.body.velocity.y += this.accel * delta;
			if (this.body.velocity.y > 0) {
				this.body.velocity.y = 0;
			}
		}
	};

	Player.prototype.fire = function() {

		if (this.alive) {
			if (this.nextShotAt > this.game.time.now) {
				return;
			}

			this.nextShotAt = this.game.time.now + this.shotDelay;

			var bullet = this.bulletPool.getFirstExists(false);
			bullet.reset(this.x, this.y - 20);

			bullet.body.velocity.y = -500 * CONFIG.PIXEL_RATIO;
		}
	};

	Player.prototype.updateBullets = function() {

		// PLAYER BULLETS
		// (dunno why some hi-speed bullets stay alive outside of the screen / world)

		this.bulletPool.forEachAlive(function (bullet) {
			if (bullet.y < -200) {
				bullet.kill();
				return;
			}
		}, this);
	};

	Player.prototype.updateBulletPool = function() {

		var s = this.strength,
				f;

		if (s < 100 ) { f = 0; }
			else if (s < 120 ) { f = 1; }
			else if (s < 160 ) { f = 2; }
			else { f = 3; }

		this.bulletPool.forEach(function(bullet) {
			bullet.animations.add('idle', [ f ], 5, true);
			bullet.play('idle');
		}, null);
	};

	Player.prototype.collectUpgrade = function(upgrade) {

		if (upgrade === 0) {
			this.playerStats.strength += 10;

		} else if (upgrade === 1) {
			this.playerStats.rate += 1;

		} else if (upgrade === 2) {
			this.playerStats.speed += 10;

		} else {
			this.playerStats.accel += 1;
		}

		this.updateStats();
		this.updateBulletPool();
	};	


	
	/************************************************************************************************
	 * MAIN GAME CLASS
	 * 
	 *
	 ************************************************************************************************/


	function Game() {
		this.score = 0;
		this.player = null;
		this.lastUpdate = 0;
		this.delta = 0;
	}

	Game.prototype = {

		create: function () {

			this.createWorld();
			this.createGround();

			this.player = new Player(this);

			// Ugly !
			this.game.camera.follow(this.player, Phaser.Camera.FOLLOW_PLATFORMER);
			this.ground.scrollFactorX = 0.0000125; /// WTF ??? Layer seems to have double x scroll speed

			// BONUSES

			this.bonusPool =  this.add.group();

			var i, o;

			for (i = 0; i < CONFIG.BONUSPOOL_SIZE; i++) {
				o = new Collectible(this, 'bonus_cube');
				this.bonusPool.add(o);
				o.exists = false; 
				o.alive = false;
			}

			// MOBS

			this.mobPools = [];
			var mob;

			// Planes
			this.mobPools[0] = this.add.group();

			for (i = 0; i < CONFIG.MOBPOOL_SIZE; i++) {
				mob = new Plane(this);
				this.mobPools[0].add(mob);
				mob.exists = false; 
				mob.alive = false;
			}

			// Widows
			this.mobPools[1] = this.add.group();

			for (i = 0; i < CONFIG.MOBPOOL_SIZE; i++) {
				mob = new Vessel(this);
				this.mobPools[1].add(mob);
				mob.exists = false; 
				mob.alive = false;
			}

			// TODO !
			// 	createMultipleExtends(state, number, poolName, className);

			// function createMultipleExtends(number, pool, className) {
			// 	for (var i = 0; i < number; i++) {
			// 		var sprite = new Mob(this);
			// 		state[poolName].add(sprite);
			// 		sprite.exists = false; 
			// 		sprite.alive = false;
			// 	}
			// }

			//			this.mobPool.createMultiple(CONFIG.MOBPOOL_SIZE, 'mob_plane_1');
			
			this.nextEnemyAt = [];
			this.enemyDelay = [];

			this.nextEnemyAt[0] = 0;
			this.enemyDelay[0] = 1000;

			this.nextEnemyAt[1] = 0;
			this.enemyDelay[1] = 5000;


			// MOB BULLETS

			this.bulletPoolMob = this.add.group();
			this.bulletPoolMob.enableBody = true;
			this.bulletPoolMob.physicsBodyType = Phaser.Physics.ARCADE;
			this.bulletPoolMob.createMultiple(100, 'mob_bullet_1');
			this.bulletPoolMob.setAll('anchor.x', 0.5);
			this.bulletPoolMob.setAll('anchor.y', 0.5);
			this.bulletPoolMob.setAll('scale.x', CONFIG.PIXEL_RATIO);
			this.bulletPoolMob.setAll('scale.y', CONFIG.PIXEL_RATIO);
			this.bulletPoolMob.setAll('outOfBoundsKill', true);
			this.bulletPoolMob.setAll('checkWorldBounds', true);

			
			// USER ACTIONS

			this.input.onDown.add(this.onInputDown, this);
			this.cursors = this.input.keyboard.createCursorKeys();

			// GUI

			this.guiText1 = this.add.bitmapText(0, 0, 'minecraftia', '');
			this.guiText1.scale.setTo(0.5, 0.5); 
			this.guiText1.fixedToCamera = true;

			this.updateGUI();
		},

		createWorld: function () {

			// this.game.world.width = CONFIG.WORLD_WIDTH * 24 * CONFIG.PIXEL_RATIO / 1,286863271;
			// this.game.world.height = CONFIG.WORLD_HEIGHT * 28 * CONFIG.PIXEL_RATIO / 1,286863271;
			this.game.physics.startSystem(Phaser.Physics.ARCADE);

			this.game.world.setBounds(0, 0, 24 * CONFIG.WORLD_WIDTH * CONFIG.PIXEL_RATIO, CONFIG.GAME_HEIGHT * CONFIG.PIXEL_RATIO);

			// console.log('Camera size     		: ' + this.game.camera.width + '/' + this.game.camera.height);
			// console.log('World size      		: ' + this.world.width + '/' + this.world.height);
		},

		createGround: function () {

			var map = this.game.add.tilemap();
			map.addTilesetImage('tileset_1', 'tileset_1', 24, 28, null, null, 0);
			
			//  Creates a new blank layer and sets the map dimensions.
			this.ground = map.create('layer0', CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT, 24, 28);
			this.ground.fixedToCamera = false;
			this.ground.scale.setTo(CONFIG.PIXEL_RATIO, CONFIG.PIXEL_RATIO);

			// this.ground.resizeWorld();	// Sets world size equal to map layer. Neglects layer scaling !
			// console.log('Ground size            : ' + this.ground.width + '/' + this.ground.height);
			
			this.ground.y = foo;	// DAT IZ HAAACCCKKK !!!

			var data = this.generateTerrain();

			for (var i=0; i<CONFIG.WORLD_WIDTH; i++) {
				for(var j=0; j<CONFIG.WORLD_HEIGHT; j++) {
					map.putTile(data[i][j],i,j,this.ground);
				}
			}
		},

		generateTerrain: function () {

			var sizeX = CONFIG.WORLD_WIDTH + 1;
			var sizeY = CONFIG.WORLD_HEIGHT + 1;

			var map = [];
			var i,j,k;

			var TILE = {
				FORREST: 		6,
				EARTH: 			6 + 15 * 1,
				WATER: 			6 + 15 * 2,
				DEEPWATER: 	6 + 15 * 3
			};

			var TILESTACK = [TILE.FORREST, TILE.EARTH, TILE.WATER, TILE.DEEPWATER];

			// Populate
			for (i = 0; i < sizeX; i++) {
				map[i] = [];
				for (j = 0; j < sizeY; j++) {
					map[i][j] = this.game.rnd.between(0, 99999);
				}
			}

			// Average
			// TODO BETTER
			for (k = 0; k < 4; k++) {
				for (i = 0; i < sizeX -1 ; i++) {
					for (j = 0; j < sizeY - 1; j++) {
						map[i][j] = (
							map[i  ][j  ] + 
							map[i+1][j  ] + 
							map[i  ][j+1] + 
							map[i+1][j+1]
							) / 4;
					}
				}
			}

			// Converting to tile numbers
			for (i = 0; i < sizeX ; i++) {
				for (j = 0; j < sizeY; j++) {

					var data = map[i][j],
							val;

					if (data > 58000) {
						val = TILE.FORREST;

					} else if (data > 50000) {
						val = TILE.EARTH;

					} else if (data > 38000) {
						val = TILE.WATER;

					} else {
						val = TILE.DEEPWATER;
						// val = TILE.EARTH;
						// val = TILE.WATER;
					}
					map[i][j] = val;
				}
			}

			// Smoothing

			for (var n = 0; n < TILESTACK.length - 1; n++) {

				var tileCurrent = TILESTACK[n],
				tileAbove = -1,
				tileBelow = -1;

				if (n > 0) {
					tileAbove = TILESTACK[n - 1];
				}

				tileBelow = TILESTACK[n + 1];	// There is always a lower layer as we don't proceed last TILESTACK item

				for (i = 0; i < sizeX ; i++) {
					for (j = 0; j < sizeY; j++) {

						// Check each tile against the current layer of terrain
						if (map[i][j] === tileCurrent) {

							// Left up
							if (i > 0         && j > 0         && map[i - 1][j - 1] !== tileCurrent && map[i - 1][j - 1] !== tileAbove && map[i - 1][j - 1] !== tileBelow) { map[i - 1][j - 1] = tileBelow; }
							// Mid up
							if (                 j > 0         && map[i    ][j - 1] !== tileCurrent && map[i    ][j - 1] !== tileAbove && map[i    ][j - 1] !== tileBelow) { map[i    ][j - 1] = tileBelow; }
							// Right up
							if (i < sizeX - 1 && j > 0         && map[i + 1][j - 1] !== tileCurrent && map[i + 1][j - 1] !== tileAbove && map[i + 1][j - 1] !== tileBelow) { map[i + 1][j - 1] = tileBelow; }
							// Right mid
							if (i < sizeX - 1                  && map[i + 1][j    ] !== tileCurrent && map[i + 1][j    ] !== tileAbove && map[i + 1][j    ] !== tileBelow) { map[i + 1][j    ] = tileBelow; }
							// Right down
							if (i < sizeX - 1 && j < sizeY - 1 && map[i + 1][j + 1] !== tileCurrent && map[i + 1][j + 1] !== tileAbove && map[i + 1][j + 1] !== tileBelow) { map[i + 1][j + 1] = tileBelow; }
							// Mid down
							if (                 j < sizeY - 1 && map[i    ][j + 1] !== tileCurrent && map[i    ][j + 1] !== tileAbove && map[i    ][j + 1] !== tileBelow) { map[i    ][j + 1] = tileBelow; }
							// Left down
							if (i > 0         && j < sizeY - 1 && map[i - 1][j + 1] !== tileCurrent && map[i - 1][j + 1] !== tileAbove && map[i - 1][j + 1] !== tileBelow) { map[i - 1][j + 1] = tileBelow; }
							// Left mid
							if (i > 0                          && map[i - 1][j    ] !== tileCurrent && map[i - 1][j    ] !== tileAbove && map[i - 1][j    ] !== tileBelow) { map[i - 1][j    ] = tileBelow; }
						}
					}
				}
			}

			// Transition tiles

			var mapFinal = [];

			for (i = 0; i < sizeX - 1; i++) {
				var row = [];
				for (j = 0; j < sizeY - 1; j++) {
					row[j] = 50; // Void tile
				}
				mapFinal[i] = row;
			}


			for (n = 1; n < TILESTACK.length; n++) {
			// for (n = 2; n < 3; n++) {

				var ab = TILESTACK[n],	// Current layer tile
						cu = TILESTACK[n - 1];	// Upper layer tile

				for (i = 0; i < sizeX - 1; i++) {
					for (j = 0; j < sizeY - 1; j++) {

						var q = [[map[i][j], map[i + 1][j]],
										[map[i][j + 1], map[i + 1][j + 1]]];

						// 4 corners
						if (q.join() === [[cu,cu],[cu,cu]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 6;

						// 3 corners
						} else if (q.join() === [[cu,cu],[cu,ab]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 9;

						} else if (q.join() === [[cu,cu],[ab,cu]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 8;

						} else if (q.join() === [[ab,cu],[cu,cu]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 3;

						} else if (q.join() === [[cu,ab],[cu,cu]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 4;

						// 2 corners
						} else if (q.join() === [[cu,cu],[ab,ab]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 11;

						} else if (q.join() === [[ab,cu],[ab,cu]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 5;

						} else if (q.join() === [[ab,ab],[cu,cu]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 1;

						} else if (q.join() === [[cu,ab],[cu,ab]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 7;

						} else if (q.join() === [[ab,cu],[cu,ab]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 14;

						} else if (q.join() === [[cu,ab],[ab,cu]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 13;

						// 1 corner
						} else if (q.join() === [[cu,ab],[ab,ab]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 12;

						} else if (q.join() === [[ab,cu],[ab,ab]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 10;

						} else if (q.join() === [[ab,ab],[ab,cu]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 0;

						} else if (q.join() === [[ab,ab],[cu,ab]].join()) {
							mapFinal[i][j] = (n - 1) * 15 + 2;

						// no corner
						} else if (q.join() === [[ab,ab],[ab,ab]].join()) {
							mapFinal[i][j] = n * 15 + 6;
						}

					}
				}
			}

			return mapFinal;
		},

		update: function () {

			this.delta = (this.game.time.now - this.lastUpdate) / 1000; //in seconds
			this.lastUpdate = this.game.time.now;

			// Enemy spawn
			this.updateEnemySpawn();

			// Collisions
			this.updateCollisions();

			// Background
			this.updateBackground(this.delta);

			// this.camera.x = 8500;
			//this.camera.focusOn(320, 400);
			// this.camera.setPosition(50, 50);
		},

		updateEnemySpawn: function () {

			for (var i = 0; i < this.mobPools.length; i++) {

				if (this.nextEnemyAt[i] < this.time.now && this.mobPools[i].countDead() > 0) {
					this.nextEnemyAt[i] = this.time.now + this.enemyDelay[i];
					var enemy = this.mobPools[i].getFirstExists(false);

					// spawn at a random location top of the screen
					enemy.reset( this.game.rnd.between(16, CONFIG.WORLD_WIDTH * 24 * CONFIG.PIXEL_RATIO - 16), - 32);
enemy.health = 100;
					// also randomize the speed
					enemy.body.velocity.y = this.rnd.integerInRange(80, 120) * CONFIG.PIXEL_RATIO;
					// replenish health (dunno why, but it's set to 1 whatever i do)
					enemy.revive();
				}
			}
		},

		updateCollisions: function () {

			for (var i = 0; i < this.mobPools.length; i++) {
				// Player bullets VS ennemy mobs
				this.physics.arcade.overlap(this.player.bulletPool, this.mobPools[i], this.bulletVSmob, null, this);

				// Player VS ennemy mobs
				this.physics.arcade.overlap(this.player, this.mobPools[i], this.playerVSmob, null, this);
			}

			// Player VS ennemy bullets
			this.physics.arcade.overlap(this.bulletPoolMob, this.player, this.playerVSbullet, null, this);

			// Player VS bonuses
			this.physics.arcade.overlap(this.bonusPool, this.player, this.playerVSbonus, null, this);
		},

		bulletVSmob: function (bullet, mob) {

			bullet.kill();
			mob.takeDamage(this.player.strength / 5);	// TODO: constant

			if (mob.health <= 0) {
				mob.die();
				this.explode(mob);

				this.score += 100;
				this.updateGUI();
			}
		},

		playerVSmob: function (player, mob) {
			player.takeDamage(20);
			mob.kill();
			this.explode(mob);
			this.updateGUI();

			if (player.health <= 0) {
				player.kill();
				player.alive = false;
				this.explode(player);
			}
		},

		playerVSbullet: function (player, bullet) {
			player.takeDamage(20);
			bullet.kill();
			this.updateGUI();

			if (player.health <= 0) {
				player.kill();
				player.alive = false;
				this.explode(player);
			}
		},

		playerVSbonus: function (player, bonus) {
			bonus.kill();
			player.collectUpgrade(bonus.bonusClass);

			this.updateGUI();
		},

		explode: function (thing) {
			var explosion = this.add.sprite(thing.x, thing.y, 'explosion_1');
			explosion.anchor.setTo(0.5, 0.5);
			explosion.scale.setTo(CONFIG.PIXEL_RATIO, CONFIG.PIXEL_RATIO);
			explosion.animations.add('boom', [ 0, 1, 2, 3, 4 ], 30, false);
			explosion.play('boom', 15, false, true);			
		},


		// MISC

		updateGUI: function () {

			var gui = '';

			var life = '';
			for (var i = 0; i < Math.round(this.player.health / 20); i++) {
				life += '@';
			}

			gui += this.score + '\n';
			gui += 'HP  ' + life + '\n';

			gui += 'STR ' + this.player.playerStats.strength + '\n';
			gui += 'RAT ' + this.player.playerStats.rate + '\n';
			gui += 'SPD ' + this.player.playerStats.speed + '\n';
			gui += 'ACC ' + this.player.playerStats.accel + '\n';

			this.guiText1.setText(gui);
		},

		updateBackground: function (delta) {
			// SCROLLING

			if (this.ground.y < 0 ) {
				this.ground.y += CONFIG.GROUND_SPEED * CONFIG.PIXEL_RATIO * delta;

			} else {
				this.ground.y = foo;
			}
		},

		onInputDown: function () {
			this.game.state.start('menu');
		},

		// RENDER

		render: function () {
			// this.game.debug.body(this.player);

			this.game.debug.text(
				'ground.y : ' + Math.round(this.ground.y) + 'px | ' + 
				this.mobPools[0].countLiving() + '/' + CONFIG.MOBPOOL_SIZE + ' mobs | ' +
				(100 - this.bulletPoolMob.countDead()) + ' mob bullets | ' +
				(100 - this.player.bulletPool.countDead()) + ' bullets | '
				, 
				0, CONFIG.GAME_HEIGHT * CONFIG.PIXEL_RATIO - 16);

			this.game.debug.text(
				// 'player.health : ' + this.player.health + ' | ' + 
				'Camera position : ' + this.camera.x + '/' + this.camera.y + ' | '
				,

				0, CONFIG.GAME_HEIGHT * CONFIG.PIXEL_RATIO - 16 + 16);
		}
	};

	window['firsttry'] = window['firsttry'] || {};
	window['firsttry'].Game = Game;

}());