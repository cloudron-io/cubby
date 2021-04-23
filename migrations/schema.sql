#### WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING
#### This file is not used by any code and is here to document the latest schema

#### General ideas
#### Default char set is utf8 and DEFAULT COLLATE is utf8_bin. Collate affects comparisons in WHERE and ORDER
#### Strict mode is enabled
#### VARCHAR - stored as part of table row (use for strings)
#### TEXT - stored offline from table row (use for strings)
#### BLOB - stored offline from table row (use for binary data)
#### https://dev.mysql.com/doc/refman/5.0/en/storage-requirements.html
#### Times are stored in the database in UTC. And precision is seconds

# The code uses zero dates. Make sure sql_mode does NOT have NO_ZERO_DATE
# http://johnemb.blogspot.com/2014/09/adding-or-removing-individual-sql-modes.html
# SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'NO_ZERO_DATE',''));

CREATE TABLE IF NOT EXISTS users(
    id VARCHAR(128) NOT NULL UNIQUE,
    username VARCHAR(254) UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    display_name VARCHAR(512) DEFAULT '',
    password VARCHAR(1024) NOT NULL,
    salt VARCHAR(512) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(128) DEFAULT '',

    PRIMARY KEY(id));

CREATE TABLE IF NOT EXISTS tokens(
    id VARCHAR(128) NOT NULL UNIQUE,
    user_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id) REFERENCES users(id),
    PRIMARY KEY(id));
