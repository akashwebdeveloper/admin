const db_config = function () {

    process.env.NODE_ENV = "development";

    this.dummyMoves = true;
};

module.exports = new db_config();
