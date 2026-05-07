export const categorizeIngredient = (name) => {
    const meates = ['鸡肉', '鸡胸肉', '火鸡', '火鸡肉', '牛肉', '三文鱼', '白鱼', '鸭肉', '羊肉', '鹿肉', '鸡肝', '牛肝', '鸡心', '鸡蛋'];
    const carbs = ['红薯', '南瓜', '燕麦', '糙米', '土豆', '米饭', '藜麦', '山药'];
    const veg = ['菠菜', '西兰花', '青豆', '西葫芦', '胡萝卜', '苹果', '蓝莓'];
    const additions = ['鱼油', '亚麻籽油', '橄榄油', '钙粉', '蛋壳粉', '葡萄糖胺', '姜黄'];

    if (meates.includes(name)) return 'meat';
    if (carbs.includes(name)) return 'carb';
    if (veg.includes(name)) return 'veg';
    return 'addition';
};

export const getNutritionInfo = (name) => {
    const cat = categorizeIngredient(name);
    if (cat === 'meat') {
        if (name.includes('内脏') || name.includes('肝') || name.includes('心')) return '微量元素 / 铁与维生素A';
        if (name.includes('鱼')) return '优质粗蛋白 / EPA & DHA';
        return '高质原生蛋白 / 核心氨基酸群';
    }
    if (cat === 'carb') {
        return '低GI缓释碳水 / 维生素B族';
    }
    if (cat === 'veg') {
        if (name.includes('蓝莓') || name.includes('苹果')) return '强效抗氧化 / 多酚 / 花青素';
        return '膳食纤维 / 消化酶促发物';
    }
    if (cat === 'addition') {
        if (name.includes('油')) return '细胞级软磷脂 / Omega-3不饱和脂肪酸';
        if (name.includes('钙') || name.includes('蛋壳')) return '骨骼守护 / 原生高吸收骨钙';
        if (name.includes('姜黄') || name.includes('葡萄糖胺')) return '靶向抗炎 / 修复因子';
    }
    return '均衡营养素';
};
