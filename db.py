import sqlite3


def create_table():

    conn = sqlite3.connect(
        "interview.db"
    )

    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS interviews(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            answer TEXT,

            evaluation TEXT,

            score TEXT,

            date TEXT

        )
        """
    )

    conn.commit()

    conn.close()


def save_interview(
    answer,
    evaluation,
    score,
    date
):

    conn = sqlite3.connect(
        "interview.db"
    )

    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO interviews(
            answer,
            evaluation,
            score,
            date
        )
        VALUES(
            ?,
            ?,
            ?,
            ?
        )
        """,
        (
            answer,
            evaluation,
            score,
            date
        )
    )

    conn.commit()

    conn.close()


def get_interviews():

    conn = sqlite3.connect(
        "interview.db"
    )

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT *
        FROM interviews
        ORDER BY id DESC
        """
    )

    data = cursor.fetchall()

    conn.close()

    return data