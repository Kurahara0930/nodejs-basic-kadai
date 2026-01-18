const express = require('express');
const app = express(); // Webサーバーの土台を作成
const PORT = 3000; // ポート番号

// DB共通モジュールをインポート
const { closePool, executeQuery } = require('./db');

// ミドルウェアでJSON形式のリクエストボディを自動的にパース
app.use(express.json());

// サーバーエラーを処理する共通関数
function handleServerError(res, error, message = 'サーバーエラー') {
    console.error(error);
    res.status(500).json({ error: message });
}

// ToDoデータ情報の作成
app.post('/todos', async (req, res) => {
    const { title, priority } = req.body;
    try {
        const result = await executeQuery(
            'INSERT INTO todos (title, priority) VALUES (?, ?);',
            [title, priority]
        );
        res.status(201).json({ id: result.insertId, title, priority, status: '未着手'});
    } catch (err) {
        handleServerError(res, err, 'データ追加に失敗しました。');
    }
})

// ToDoデータの読み取り
app.get('/todos', async (req, res) => {
    try {
        const rows = await executeQuery(
            'SELECT * FROM todos;',
        );
        res.status(200).json(rows);
    } catch (err) {
        handleServerError(res, err, 'データ取得に失敗しました。');
    }
})

// ToDoデータ情報の更新
app.post('/todos/:id', async (req, res) => {
    const { title, priority, status } = req.body;
    try {
        const result = await executeQuery(
            'UPDATE todos SET title = ?, priority = ?, status = ? WHERE id = ?;',
            [title, priority, status, req.params.id]
        );

        // 対象データが存在しない場合は404 Not Foundを返却
        result.affectedRows === 0
            ? res.status(404).json({ error: '更新対象のデータが見つかりません。'})
            : res.status(200).json({ id: result.insertId, title, priority, status: '未着手'});
    } catch (err) {
        handleServerError(res, err, 'データ更新に失敗しました。');
    }
})

// ToDoデータ情報の削除
app.delete('/todos/:id', async (req, res) => {
    try {
        const result = await executeQuery(
            'DELETE FROM todos WHERE id = ?;',
            [req.params.id]
        );

        // 1行も削除されていなければ404 Not Foundを返却
        result.affectedRows === 0
            ? res.status(404).json({ error: '削除対象のデータが見つかりません' })
            : res.status(200).json({ message: 'データを削除しました' });
    } catch (err) {
        handleServerError(res, err, 'データ削除に失敗しました');
    }
});

// アプリ終了時にDB接続プールを安全に破棄する
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
    process.on(signal, async () => {
        console.log(`\n${signal}を受信。アプリケーションの終了処理中...`);
        await closePool();
        process.exit();
    })
});

// Webサーバーを起動
app.listen(PORT, () => {
    console.log(`${PORT}番ポートでWebサーバーが起動しました。`);
});