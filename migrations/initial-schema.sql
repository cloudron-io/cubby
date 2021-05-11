CREATE TABLE IF NOT EXISTS users(
    username VARCHAR(128) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    display_name VARCHAR(512) DEFAULT '',
    password VARCHAR(1024) NOT NULL,
    salt VARCHAR(512) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(128) DEFAULT '',

    PRIMARY KEY(username));

CREATE TABLE IF NOT EXISTS tokens(
    id VARCHAR(128) NOT NULL UNIQUE,
    username VARCHAR(128) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(username) REFERENCES users(username),
    PRIMARY KEY(id));

CREATE TABLE IF NOT EXISTS shares(
    id VARCHAR(128) NOT NULL UNIQUE,
    owner VARCHAR(128) NOT NULL,
    file_path VARCHAR(256) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    readonly BOOLEAN NOT NULL DEFAULT FALSE,
    receiver_username VARCHAR(128),
    receiver_email VARCHAR(128),

    FOREIGN KEY(receiver_username) REFERENCES users(username),
    FOREIGN KEY(owner) REFERENCES users(username),
    PRIMARY KEY(id));
