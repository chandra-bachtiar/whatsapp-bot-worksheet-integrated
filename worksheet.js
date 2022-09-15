const { google } = require("googleapis");
const dotenv = require("dotenv");
dotenv.config();

const FILE = process.env.SECRET;
const sheetId = process.env.SHEET_ID;
const shitId = process.env.SHIT_ID;

const auth = new google.auth.GoogleAuth({
    keyFile: FILE,
    scopes: "https://www.googleapis.com/auth/spreadsheets",
});

async function authGoogle() {
    const sheet = await auth.getClient();
    const googleSheets = google.sheets({ version: "v4", auth: sheet });
    return googleSheets;
}

async function getLastId() {
    const googleSheets = await authGoogle();
    const getRows = await googleSheets.spreadsheets.values.get({
        auth: auth,
        spreadsheetId: sheetId,
        range: "Detail Pengeluaran 2022!A:H",
    });
    let res = getRows.data.values.slice(2).length + 1;
    console.log(res);
    return res;
}

async function deleteRow(id) {
    const googleSheets = await authGoogle();
    let config = {
        requests: [
            {
                deleteDimension: {
                    range: {
                        sheetId: shitId,
                        dimension: "ROWS",
                        startIndex: id + 1,
                        endIndex: id + 2,
                    },
                },
            },
        ],
    };
    let hapus = await googleSheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: config,
    });
    if (hapus.status === 200) {
        await recountingId();
        return {
            status: 200,
            message: "Pengeluaran Berhasil Dihapus",
        };
    } else {
        return {
            status: hapus.status,
            message:
                "Pengeluaran Gagal Dihapus\n*Error Code : " +
                hapus.status +
                "*",
        };
    }
}

async function recountingId() {
    const googleSheets = await authGoogle();
    const getRows = await googleSheets.spreadsheets.values.get({
        auth: auth,
        spreadsheetId: sheetId,
        range: "Detail Pengeluaran 2022!A:H",
    });
    const res = getRows.data.values.slice(2);
    let ke = 0;
    console.log(res);
    res.forEach(async (ress) => {
        ke++;
        await googleSheets.spreadsheets.values.update({
            auth: auth,
            spreadsheetId: sheetId,
            valueInputOption: "USER_ENTERED",
            range: "Detail Pengeluaran 2022!A" + (ke + 2) + ":A" + (ke + 2),
            resource: {
                values: [[ke]],
            },
        });
    });
}

async function pengeluaran(nominal, nama, jenis, keterangan) {
    let tanggal = new Date();
    let tanggal_ =
        tanggal.getDate() +
        "/" +
        (tanggal.getMonth() + 1) +
        "/" +
        tanggal.getFullYear();
    let bulan = tanggal.getMonth() + 1;
    let tahun = tanggal.getFullYear();
    let id = await getLastId();

    const googleSheets = await authGoogle();

    googleSheets.spreadsheets.values
        .append({
            auth: auth,
            spreadsheetId: sheetId,
            range: "Detail Pengeluaran 2022!A:E",
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [
                    [
                        id,
                        tanggal_,
                        nama,
                        nominal,
                        jenis,
                        keterangan,
                        bulan,
                        tahun,
                    ],
                ],
            },
        })
        .then(() => {
            console.log("[Keuangan] Pengeluaran berhasil ditambahkan");
        })
        .catch((err) => {
            console.log("[Keuangan] Pengeluaran gagal ditambahkan");
            console.log(err);
        });
}

async function getRekap() {
    const googleSheets = await authGoogle();
    const getRows = await googleSheets.spreadsheets.values.get({
        auth: auth,
        spreadsheetId: sheetId,
        range: "Detail Pengeluaran 2022!A:H",
    });
    return getRows;
}

// export pengeluaran
module.exports = { pengeluaran, getRekap, deleteRow, recountingId };
