import { Category } from '../models/Category';

export const DEFAULT_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  { id: 'cat_food',        name: 'Food & Dining',    icon: 'restaurant',      color: '#FF6B6B', isSystem: true, keywords: ['swiggy','zomato','restaurant','food','dining','cafe','hotel','pizza','biryani','thali'] },
  { id: 'cat_transport',   name: 'Transport',         icon: 'directions-car',             color: '#4ECDC4', isSystem: true, keywords: ['uber','ola','rapido','auto','taxi','metro','bus','petrol','diesel','fuel'] },
  { id: 'cat_shopping',    name: 'Shopping',          icon: 'shopping-bag',    color: '#45B7D1', isSystem: true, keywords: ['amazon','flipkart','myntra','ajio','nykaa','meesho','shop','store','mall'] },
  { id: 'cat_groceries',   name: 'Groceries',         icon: 'shopping-cart',   color: '#96CEB4', isSystem: true, keywords: ['bigbasket','blinkit','grofers','zepto','jiomart','dmart','supermarket','grocery'] },
  { id: 'cat_entertainment',name: 'Entertainment',    icon: 'movie',           color: '#FFEAA7', isSystem: true, keywords: ['netflix','hotstar','spotify','youtube','prime','zee5','sonyliv','bookmyshow','pvr','inox'] },
  { id: 'cat_utilities',   name: 'Utilities',         icon: 'bolt',            color: '#DDA0DD', isSystem: true, keywords: ['electricity','water','gas','bescom','tata','bses','recharge','broadband','wifi','internet'] },
  { id: 'cat_health',      name: 'Health & Medical',  icon: 'local-hospital',  color: '#98D8C8', isSystem: true, keywords: ['hospital','pharmacy','medical','clinic','doctor','apollo','fortis','manipal','1mg','pharmeasy'] },
  { id: 'cat_insurance',   name: 'Insurance',         icon: 'security',        color: '#B8860B', isSystem: true, keywords: ['insurance','premium','lic','icici','hdfc','policy','term','health'] },
  { id: 'cat_emi',         name: 'EMI / Loan',        icon: 'account-balance',  color: '#CD853F', isSystem: true, keywords: ['emi','installment','loan','equated','lender','bajaj','hdfc','icici'] },
  { id: 'cat_rent',        name: 'Rent & Housing',    icon: 'home',            color: '#778899', isSystem: true, keywords: ['rent','maintenance','society','housing','landlord','property'] },
  { id: 'cat_salary',      name: 'Salary / Income',   icon: 'attach-money',    color: '#32CD32', isSystem: true, keywords: ['salary','credited','credited to','payroll','income','bonus','stipend'] },
  { id: 'cat_transfer',    name: 'Transfer',          icon: 'swap-horiz',      color: '#87CEEB', isSystem: true, keywords: ['transfer','sent','received','neft','rtgs','imps','upi','trf'] },
  { id: 'cat_investment',  name: 'Investment',        icon: 'trending-up',     color: '#FFD700', isSystem: true, keywords: ['mutual fund','sip','zerodha','groww','demat','stocks','equity','fd','fixed deposit'] },
  { id: 'cat_other',       name: 'Other',             icon: 'more-horiz',      color: '#C0C0C0', isSystem: true, keywords: [] },
];
