const qrcode = require("qrcode-terminal");
const fs = require("fs");
const { Client, LocalAuth, MessageMedia, List } = require("whatsapp-web.js");

//google apis
const {
    pengeluaran,
    getRekap,
    deleteRow,
    recountingId,
} = require("./worksheet.js");

const JENIS = [
    "JAJAN",
    "KESEHATAN",
    "BENSIN",
    "SHOPEE",
    "KUOTA",
    "MAKAN",
    "AMAL",
    "CICILAN",
];

const DEVICE = ["62xxxxxxxx@c.us", "62xxxxxxxx@c.us"]; // fill this with your number

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client1",
    }),
    puppeteer: {
        headless: false,
        // executablePath: '/usr/bin/google-chrome-stable',
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process", // <- this one doesn't works in Windows
            "--disable-gpu",
        ],
    },
});

client.on("message", async (msg) => {
    console.log(msg.from);
    if (DEVICE.includes(msg.from)) {
        let nama = msg.from == DEVICE[0] ? "your name" : "your opponent name";
        if (msg.body.includes("#pengeluaran")) {
            const jenisnya = msg.body.split(" ")[1];
            const nominal = msg.body.split(" ")[2];
            const keterangan = msg.body.split(" ").slice(3).join(" ");
            if (!JENIS.includes(jenisnya.toUpperCase())) {
                msg.reply("Jenis pengeluaran tidak ditemukan");
                client.sendMessage(
                    msg.from,
                    "#jenis untuk melihat semua jenis pengeluaran!"
                );
                return;
            }
            pengeluaran(nominal, nama, jenisnya, keterangan);
            msg.reply("Pengeluaran berhasil ditambahkan");
        }

        if (msg.body.includes("#rekap")) {
            let barisData = await getRekap();
            let result = barisData.data.values.slice(2);
            let bulan = msg.body.split(" ")[1];
            let tahun = msg.body.split(" ")[2];

            if (bulan === undefined || tahun === undefined) {
                msg.reply("Harus ada format bulan dan tahun!");
                return;
            }

            if (msg.from == DEVICE[0]) {
                const nama = "your name";
                sendRekapan(result, nama, bulan, tahun, msg.from);
            } else {
                const nama = "your opponent name";
                sendRekapan(result, nama, bulan, tahun, msg.from);
            }
        }

        if (msg.body.includes("#detail")) {
            let res = await getRekap();
            let barisData = res.data.values.slice(2);
            let bulan = msg.body.split(" ")[1];
            let tahun = msg.body.split(" ")[2];

            if (bulan === undefined || tahun === undefined) {
                msg.reply("Harus ada format bulan dan tahun!");
                return;
            }

            if (msg.from == DEVICE[0]) {
                const nama = "your name";
                sendDetail(barisData, nama, bulan, tahun, msg.from);
            } else {
                const nama = "your opponent name";
                sendDetail(barisData, nama, bulan, tahun, msg.from);
            }
        }

        if (msg.body.includes("#hapus")) {
            let id = parseInt(msg.body.split(" ")[1]) || 0;
            if (id === undefined) {
                msg.reply("ID Tidak ditemukan!");
                return;
            }
            console.log(id);
            let hapus = await deleteRow(id);
            if (hapus.status === 200) {
                client.sendMessage(msg.from, hapus.message);
            } else {
                client.sendMessage(msg.from, hapus.message);
            }
        }

        if (msg.body.includes("#hitung")) {
            await recountingId();
        }

        if (msg.body.includes("#jenis")) {
            msg.reply(JENIS.join("\n"));
        }

        if (msg.body.includes("#bantuan")) {
            const section = {
                title: "test",
                rows: [
                    {
                        title: "Test 1",
                    },
                    {
                        title: "Test 2",
                        id: "test-2",
                    },
                    {
                        title: "Test 3",
                        description:
                            "This is a smaller text field, a description",
                    },
                    {
                        title: "Test 4",
                        description:
                            "This is a smaller text field, a description",
                        id: "test-4",
                    },
                ],
            };
            const list = new List(
                "test",
                "click me",
                [section],
                "title",
                "footer"
            );
            client.sendMessage(msg.from,list);
        }
    }
});

function sendDetail(result, nama, bulan, tahun, nomor) {
    let text = `*Detail Pengeluaran*\n`;
    let hasilData = result.filter(
        (res) =>
            parseInt(res[6]) == bulan &&
            parseInt(res[7]) == tahun &&
            res[2] == nama
    );
    console.log(hasilData);
    let total = 0;
    let ke = 0;
    let tanggal = "";
    hasilData.forEach((res) => {
        ke++;
        if (res[1] !== tanggal) {
            tanggal = res[1];
            text += `\n*${tanggal}*\n`;
            text += `==============\n`;
            text += `*[ ${res[0]} ]* ${res[5]} => Rp. ${parseInt(
                res[3]
            ).toLocaleString("id-ID")}\n`;
        } else {
            text += `*[ ${res[0]} ]* ${res[5]} => Rp. ${parseInt(
                res[3]
            ).toLocaleString("id-ID")}\n`;
        }
        total += parseInt(res[3]);
    });

    text += `======================= + \n`;
    text += `*Total Pengeluaran : Rp. ${total.toLocaleString("id-ID")}*`;
    client.sendMessage(nomor, text);
}

function sendRekapan(result, nama, bulan, tahun, nomor) {
    let text = `*Rekap Pengeluaran*\n`;
    let tanggal = [
        ...new Set(result.filter((res) => res[2] == nama).map((tgl) => tgl[1])),
    ].filter((bln) => parseInt(bln[6]) == bulan && parseInt(bln[7]) == tahun);
    let total = 0;
    let ke = 0;
    tanggal.forEach((tgl) => {
        ke++;
        let pengeluaran = result
            .filter((res) => res[1] == tgl && res[2] == nama)
            .map((res) => parseInt(res[3]) || 0)
            .reduce((a, b) => a + b);
        total += pengeluaran;
        text += `${ke}. ${tgl} => Rp. ${pengeluaran.toLocaleString("id-ID")}\n`;
        // console.log();
    });
    text += `======================= + \n`;
    text += `*Total Pengeluaran : Rp. ${total.toLocaleString("id-ID")}*`;
    client.sendMessage(nomor, text);
}

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
    console.log("[Keuangan Ready] is ready!");
});

client.initialize();
