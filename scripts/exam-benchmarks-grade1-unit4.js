'use strict';

/**
 * Benchmark questions from 一年级数学下（R）附录Ⅲ 第四单元学业质量测评.
 * Keys: "grade|sem|topic" matching parseKnowledgePoints output.
 * Content uses exam markup: [[img:path]], {{header:pinyin|title|points}}, {{pinyin:py|字}}, □ ○
 */

const IMG = '../../assets/exam/grade1-math-unit4';

function q(subject, grade, type, content, answer, options = null, image_path = null) {
  return { subject, grade, type, content, options, answer, image_path };
}

const CMP = ['>', '<', '='];

/** @type {Record<string, object[]>} */
const byTopic = {
  '1|下册|口算加法': [
    q('math', 1, 'fill', '{{header:tián yi tián|一、填一填。|12 分}}\n1. 37 + 40 = □\n[[img:' + IMG + '/decompose-37-40.png|alt:37+40分解图]]', '77', null, IMG + '/decompose-37-40.png'),
    q('math', 1, 'fill', '直接写出得数：10 + 52 = （ ）', '62'),
    q('math', 1, 'fill', '直接写出得数：22 + 54 = （ ）', '76'),
    q('math', 1, 'fill', '直接写出得数：71 + 20 = （ ）', '91'),
    q('math', 1, 'fill', '直接写出得数：30 + 36 = （ ）', '66'),
    q('math', 1, 'fill', '直接写出得数：8 + 37 = （ ）', '45'),
    q('math', 1, 'fill', '直接写出得数：29 + 9 = （ ）', '38'),
    q('math', 1, 'fill', '直接写出得数：1 + 78 = （ ）', '79'),
    q('math', 1, 'fill', '□ + 20 = 48，□ = （ ）', '28'),
    q('math', 1, 'fill', '□ + 30 = 53，□ = （ ）', '23'),
    q('math', 1, 'fill', '□ + 11 = 36，□ = （ ）', '25'),
    q('math', 1, 'fill', '一个数是 42，另一个数是 30，它们的和是（ ）。', '72'),
    q('math', 1, 'choice', '在 ○ 里填 >、< 或 =：39 + 7 ○ 47', '<', CMP),
    q('math', 1, 'choice', '在 ○ 里填 >、< 或 =：48 + 6 ○ 55', '>', CMP),
    q('math', 1, 'choice', '在 ○ 里填 >、< 或 =：43 + 50 ○ 93', '=', CMP),
    q('math', 1, 'choice', '在 ○ 里填 >、< 或 =：32 + 50 ○ 82', '=', CMP),
    q('math', 1, 'choice', '在 65+3、65+30、56+30 中，6 和 3 能直接相加的是？', '65+3', ['65+3', '65+30', '56+30', '56+3']),
    q('math', 1, 'choice', '下列算式中，得数与 78 − 30 相同的是？', '7+60', ['38+7', '59−15', '30+18', '7+60']),
    q('math', 1, 'fill', '{{header:kàn tú liè shì|五、看图列式计算。|6 分}}\n[[img:' + IMG + '/eggs-38plus6.png|alt:38个鸡蛋和6个鸡蛋|class:exam-figure exam-fig-right]]\n1. 一共有多少个？\n38 + 6 = □', '44', null, IMG + '/eggs-38plus6.png'),
    q('math', 1, 'fill', '35 + 7 = （ ）', '42'),
  ],
  '1|下册|口算减法': [
    q('math', 1, 'fill', '直接写出得数：83 − 7 = （ ）', '76'),
    q('math', 1, 'fill', '直接写出得数：90 − 5 = （ ）', '85'),
    q('math', 1, 'fill', '直接写出得数：67 − 16 = （ ）', '51'),
    q('math', 1, 'fill', '直接写出得数：26 − 8 = （ ）', '18'),
    q('math', 1, 'fill', '直接写出得数：56 − 20 = （ ）', '36'),
    q('math', 1, 'fill', '直接写出得数：53 − 8 = （ ）', '45'),
    q('math', 1, 'fill', '直接写出得数：76 − 32 = （ ）', '44'),
    q('math', 1, 'fill', '35 − 7 = （ ）', '28'),
    q('math', 1, 'fill', '一个数是 42，另一个数是 30，它们的差是（ ）。', '12'),
    q('math', 1, 'choice', '在 ○ 里填 >、< 或 =：66 − 40 ○ 30', '<', CMP),
    q('math', 1, 'choice', '在 ○ 里填 >、< 或 =：76 − 6 ○ 68', '>', CMP),
    q('math', 1, 'choice', '{{header:xuǎn yi xuǎn|二、选一选。|10 分}}\n1. 下面哪幅图表示的算式是？\n[[img:' + IMG + '/sticks-65minus8.png|alt:6捆小棒和5根小棒|class:exam-figure]]\n6 捆小棒（每捆 10 根）和 5 根小棒，拿走 8 根，算式是？', '65−8', ['60+5', '55−8', '65−8', '65+8'], IMG + '/sticks-65minus8.png'),
    q('math', 1, 'choice', '下列能表示 43 − 20 的是？\n[[img:' + IMG + '/place-value-43minus20.png|alt:43-20图示|class:exam-figure]]', '从 4 个十和 3 个一中去掉 2 个十', [
      '从 4 个十和 3 个一中去掉 2 个十',
      '4 加 3 再加 20',
      '43 和 20 合并',
      '43 分成 20 和 23',
    ], IMG + '/place-value-43minus20.png'),
    q('math', 1, 'choice', '要使 76 − ★ = 6□ 成立，★ 最小是？', '7', ['6', '7', '10', '16']),
    q('math', 1, 'choice', '下列算式中，得数与 53 − 8 相同的是？', '60−6', ['38+7', '59−15', '30+18', '60−6']),
    q('math', 1, 'fill', '42 + 23 > □，□ 最大能填（ ）。', '64'),
    q('math', 1, 'fill', '40 > □ + 24，□ 最大能填（ ）。', '15'),
    q('math', 1, 'fill', '从 70 开始连续减 5：70、65、60、55、50，下一个数是（ ）。', '45'),
    q('math', 1, 'fill', '[[img:' + IMG + '/beads-40minus8.png|alt:40颗珠子|class:exam-figure exam-fig-right]]\n看图列式：一共 40 颗，左边 8 颗，右边有多少颗？\n40 − 8 = □', '32', null, IMG + '/beads-40minus8.png'),
    q('math', 1, 'fill', '22、27、32、37，按规律下一个数是（ ）。', '42'),
  ],
  '1|下册|整理和复习': [
    q('math', 1, 'fill', '[[img:' + IMG + '/birds-24plus4.png|alt:24只鸟又飞来4只|class:exam-figure exam-fig-right]]\n六、解决问题。\n1. 现在有多少只鸟？\n原来有 24 只鸟，又飞来 4 只，现在有多少只鸟？（ ）只', '28', null, IMG + '/birds-24plus4.png'),
    q('math', 1, 'fill', '[[img:' + IMG + '/grain-art.png|alt:五谷画|class:exam-figure exam-fig-right]]\n36 名同学每人要设计一幅五谷画，已经设计好了 8 幅，还要设计多少幅？（ ）幅', '28', null, IMG + '/grain-art.png'),
    q('math', 1, 'fill', '[[img:' + IMG + '/balloons-doudou-beibei.png|alt:豆豆和贝贝吹气球|class:exam-figure]]\n3. 豆豆吹了 22 个气球，贝贝吹了 25 个气球，他们一共吹了多少个？（ ）个', '47', null, IMG + '/balloons-doudou-beibei.png'),
    q('math', 1, 'fill', '贝贝吹了 25 个气球，已经挂好了 9 个，还剩多少个没挂好？（ ）个', '16'),
    q('math', 1, 'fill', '[[img:' + IMG + '/teacups-35.png|alt:35个茶杯|class:exam-figure exam-fig-right]]\n社区准备了 35 个茶杯，一个盘子放 7 个，全部放完至少需要几个盘子？（ ）个', '5', null, IMG + '/teacups-35.png'),
    q('math', 1, 'choice', '[[img:' + IMG + '/bus-groups-table.png|alt:三组师生人数|class:exam-figure exam-fig-right]]\n大客车限乘客 56 人。美术组 20 人、合唱组 28 人、舞蹈组 30 人，哪两组可以一起坐车？', '美术组和合唱组', [
      '美术组和合唱组',
      '美术组和舞蹈组',
      '合唱组和舞蹈组',
      '三组都可以',
    ], IMG + '/bus-groups-table.png'),
    q('math', 1, 'choice', '豆豆第一天读 20 页，第三天从第 65 页开始读，第二天读了多少页？', '44', ['43', '44', '45', '46']),
    q('math', 1, 'choice', '把 54+40、28+5、76−6、43+50、39+7 按得数从大到小排，得数最大的是？', '54+40', ['28+5', '39+7', '54+40', '76−6']),
    q('math', 1, 'fill', '70 连续加 5：70、75、80、85，下一个数是（ ）。', '90'),
    q('math', 1, 'fill', '□ + 9 = 45，□ = （ ）', '36'),
  ],
};

module.exports = { byTopic };
