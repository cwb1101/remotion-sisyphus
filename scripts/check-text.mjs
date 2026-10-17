// 扫描数据文件和所有组件 确认画面文字里没有任何标点符号
// 规则 画面文字只允许 汉字 英文字母 数字 空格
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const data = JSON.parse(readFileSync(join(root, 'src/data/script.json'), 'utf8'));
const ALLOWED = /^[一-鿿A-Za-z0-9 ]*$/;
const problems = [];
let checked = 0;

const check = (where, text) => {
	checked++;
	if (!ALLOWED.test(text)) {
		const bad = [...text].filter((c) => !/[一-鿿A-Za-z0-9 ]/.test(c));
		problems.push(`${where} 含有 ${[...new Set(bad)].map((c) => JSON.stringify(c)).join(' ')} 原文 ${text}`);
	}
};

// 数据文件里所有会上屏的字段
check('meta.episode', data.meta.episode);
check('meta.title', data.meta.title);
check('meta.watermark', data.meta.watermark);
data.chapterNames.forEach((n, i) => check(`chapterNames[${i}]`, n));
data.chapters.forEach((c) => check(`chapters ${c.index}`, c.name));
for (const s of data.screens) {
	check(`屏 ${s.id} 字幕`, s.text);
	s.highlights.forEach((h) => check(`屏 ${s.id} 高亮词`, h.word));
}
const walk = (obj, path) => {
	if (typeof obj === 'string') check(path, obj);
	else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, `${path}[${i}]`));
	else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`);
};
walk(data.labels, 'labels');

// 组件源码 去掉注释后不允许出现任何中文 画面文字必须全部来自数据文件
// 同时检查 JSX 里直接写出来的文本节点
const files = [];
const collect = (dir) => {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) collect(p);
		else if (/\.(tsx|ts)$/.test(name)) files.push(p);
	}
};
collect(join(root, 'src'));
for (const file of files) {
	const code = readFileSync(file, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
		.replace(/(^|[^:])\/\/.*$/gm, '$1');
	const rel = file.slice(root.length);
	const cjk = code.match(/[^\x00-\x7F]+/g);
	if (cjk) problems.push(`${rel} 组件源码里有非 ASCII 文字 ${[...new Set(cjk)].join(' ')}`);
	for (const m of code.matchAll(/>([^<>{}]*[^\s<>{}][^<>{}]*)</g)) {
		const t = m[1].trim();
		if (t && !/^[=&|?:;.,()\-+*/!%\w\s'"`]*$/.test(t)) continue;
		if (t && /^[A-Za-z0-9 ]+$/.test(t)) {
			checked++;
			continue;
		}
		if (t && !/[=&|?;(){}]/.test(t)) problems.push(`${rel} JSX 文本节点 ${t}`);
	}
}

console.log(`检查了 ${checked} 段画面文字 ${files.length} 个源文件`);
if (problems.length) {
	console.error(problems.join('\n'));
	process.exit(1);
}
console.log('没有发现标点符号');
