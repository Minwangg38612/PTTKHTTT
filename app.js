/* ===========================
   app.js — GiàyVN Storefront
   - Giữ nguyên chức năng cũ, bổ sung JS chi tiết hơn
   - Active menu, gallery About
   - Add to Cart / Wishlist (localStorage)
   - Render giỏ hàng, yêu thích
   - Login validation (giả lập)
   - Newsletter tránh reload
   =========================== */

/* Helpers */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const getJSON = (k, fallback) => { try{const s=localStorage.getItem(k);return s?JSON.parse(s):fallback;}catch{ return fallback; } };
const setJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const formatVND = (n) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n);

/* Keys */
const LS_KEYS = { CART:'gvn_cart', WISHLIST:'gvn_wishlist', USER:'gvn_user' };

/* Cart state */
const cart = {
  items: getJSON(LS_KEYS.CART, []), // [{id,name,price,img,qty}]
  save(){ setJSON(LS_KEYS.CART, this.items); },
  add(item){
    const i = this.items.findIndex(x=>x.id===item.id);
    if(i>=0) this.items[i].qty += item.qty||1;
    else this.items.push({...item, qty:item.qty||1});
    this.save(); toast(`Đã thêm "${item.name}" vào giỏ`);
  },
  remove(id){ this.items = this.items.filter(x=>x.id!==id); this.save(); },
  setQty(id, qty){ const it=this.items.find(x=>x.id===id); if(!it) return; it.qty=Math.max(1,qty|0); this.save(); },
  clear(){ this.items=[]; this.save(); },
  total(){ return this.items.reduce((s,x)=>s+x.price*x.qty,0); },
  count(){ return this.items.reduce((s,x)=>s+x.qty,0); }
};

/* Wishlist state */
const wishlist = {
  items: getJSON(LS_KEYS.WISHLIST, []), // [{id,name,price,img}]
  save(){ setJSON(LS_KEYS.WISHLIST, this.items); },
  toggle(item){
    const i = this.items.findIndex(x=>x.id===item.id);
    if(i>=0){ const r=this.items.splice(i,1)[0]; this.save(); toast(`Đã bỏ "${r.name}" khỏi yêu thích`); return false; }
    this.items.push(item); this.save(); toast(`Đã thêm "${item.name}" vào yêu thích`); return true;
  },
  remove(id){ this.items = this.items.filter(x=>x.id!==id); this.save(); }
};

/* Toast */
function toast(msg="Thành công", time=1800){
  let box = $('#toast-box');
  if(!box){
    box = document.createElement('div');
    box.id = 'toast-box';
    Object.assign(box.style, {position:'fixed',right:'16px',bottom:'16px',zIndex:'9999',display:'grid',gap:'8px'});
    document.body.appendChild(box);
  }
  const t=document.createElement('div');
  t.textContent=msg;
  Object.assign(t.style,{padding:'10px 14px',borderRadius:'10px',background:'#130f40',color:'#fff',boxShadow:'0 .5rem 1.2rem rgba(0,0,0,.15)',fontSize:'14px'});
  box.appendChild(t);
  setTimeout(()=>t.remove(), time);
}

/* Active menu theo URL */
(function(){
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('.main-nav a').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href')===path);
  });
})();

/* About gallery (nếu có) */
(function(){
  const mainImg = $('.about-wrap figure img');
  const thumbs = $$('.about-wrap .thumbs img');
  if(!mainImg || !thumbs.length) return;
  thumbs.forEach(img=>{
    img.addEventListener('click', ()=>{ mainImg.src = img.src; });
  });
})();

/* Gắn sự kiện Add to cart / Add to wishlist */
document.addEventListener('click', (e)=>{
  const cartBtn = e.target.closest('.add-to-cart');
  if(cartBtn){
    e.preventDefault();
    const item = {
      id: cartBtn.dataset.id,
      name: cartBtn.dataset.name,
      price: parseInt(cartBtn.dataset.price,10)||0,
      img: cartBtn.dataset.img
    };
    if(!item.id) return toast('Thiếu dữ liệu sản phẩm');
    cart.add(item); updateHeaderCounts();
  }

  const wishBtn = e.target.closest('.add-to-wishlist');
  if(wishBtn){
    e.preventDefault();
    const item = {
      id: wishBtn.dataset.id,
      name: wishBtn.dataset.name,
      price: parseInt(wishBtn.dataset.price,10)||0,
      img: wishBtn.dataset.img
    };
    wishlist.toggle(item); updateHeaderCounts();
  }
});

/* Badge đếm ở header */
function updateHeaderCounts(){
  setBadge('.quick-icons a[aria-label="Giỏ hàng"]', 'cart-count-badge', cart.count());
  setBadge('.quick-icons a[aria-label="Yêu thích"]', 'wish-count-badge', wishlist.items.length);
}
function setBadge(selector, id, value){
  const anchor = document.querySelector(selector);
  if(!anchor) return;
  let badge = anchor.querySelector('#'+id);
  if(!badge){
    badge = document.createElement('span');
    badge.id = id;
    badge.className = 'badge';
    anchor.appendChild(badge);
  }
  badge.textContent = value;
}
updateHeaderCounts();

/* Render Giỏ hàng (cart.html) */
(function renderCart(){
  if(!/cart\.html(\?|#|$)/.test(location.pathname)) return;
  const page = $('.page');
  let root = $('#cart-root');
  if(!root){ root = document.createElement('section'); root.id='cart-root'; root.className='cart-root'; page.appendChild(root); }

  if(!cart.items.length){
    root.innerHTML = `
      <div class="placeholder">
        <p>Giỏ hàng của bạn đang trống.</p>
        <p><a class="btn" href="products.html">Tiếp tục mua sắm</a></p>
      </div>`;
    return;
  }

  const rows = cart.items.map(it=>`
    <tr data-id="${it.id}">
      <td><img src="${it.img}" alt="${it.name}" style="width:64px;height:auto;border-radius:8px"></td>
      <td>${it.name}</td>
      <td>${formatVND(it.price)}</td>
      <td><input type="number" min="1" class="qty-input" value="${it.qty}"></td>
      <td class="line-total">${formatVND(it.price*it.qty)}</td>
      <td><button class="btn btn-remove" data-id="${it.id}">Xoá</button></td>
    </tr>
  `).join('');

  root.innerHTML = `
    <div class="cart-wrap" style="padding:1.2rem 2rem">
      <div class="cart-actions" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <button class="btn btn-clear">Xoá hết</button>
        <a href="products.html" class="btn">Mua thêm</a>
      </div>
      <div class="table-wrap" style="overflow:auto;border:1px solid #eee;border-radius:12px">
        <table>
          <thead style="background:#fafafa">
            <tr>
              <th>Hình</th><th>Sản phẩm</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="cart-summary" style="margin-top:12px;display:flex;justify-content:flex-end;gap:16px;align-items:center">
        <strong>Tổng cộng:</strong>
        <span id="cart-total" style="font-size:1.1rem">${formatVND(cart.total())}</span>
        <a href="#" class="btn btn-checkout">Thanh toán</a>
      </div>
    </div>`;

  root.addEventListener('input', e=>{
    const input = e.target.closest('.qty-input'); if(!input) return;
    const tr = input.closest('tr'); const id = tr?.dataset.id;
    const qty = parseInt(input.value,10)||1;
    cart.setQty(id, qty);
    const item = cart.items.find(x=>x.id===id);
    $('.line-total', tr).textContent = formatVND(item.price*item.qty);
    $('#cart-total').textContent = formatVND(cart.total());
    updateHeaderCounts();
  });

  root.addEventListener('click', e=>{
    const rm = e.target.closest('.btn-remove');
    if(rm){ cart.remove(rm.dataset.id); toast('Đã xoá sản phẩm'); renderCart(); updateHeaderCounts(); }
    const clr = e.target.closest('.btn-clear');
    if(clr){ cart.clear(); toast('Đã xoá toàn bộ giỏ'); renderCart(); updateHeaderCounts(); }
    const checkout = e.target.closest('.btn-checkout');
    if(checkout){ e.preventDefault(); toast('Chức năng thanh toán sẽ bổ sung sau'); }
  });
})();

/* Render Yêu thích (wishlist.html) */
(function renderWishlist(){
  if(!/wishlist\.html(\?|#|$)/.test(location.pathname)) return;
  const page = $('.page');
  let root = $('#wishlist-root');
  if(!root){ root = document.createElement('section'); root.id='wishlist-root'; root.className='wishlist-root'; page.appendChild(root); }

  if(!wishlist.items.length){
    root.innerHTML = `
      <div class="placeholder">
        <p>Danh sách yêu thích trống.</p>
        <p><a class="btn" href="products.html">Tiếp tục mua sắm</a></p>
      </div>`;
    return;
  }

  const cards = wishlist.items.map(it=>`
    <article class="card" data-id="${it.id}">
      <figure><img src="${it.img}" alt="${it.name}"></figure>
      <h3>${it.name}</h3>
      <p class="price">${formatVND(it.price)}</p>
      <p style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="#" class="btn add-to-cart" data-id="${it.id}" data-name="${it.name}" data-price="${it.price}" data-img="${it.img}">Thêm vào giỏ</a>
        <a href="#" class="btn btn-remove-wish" data-id="${it.id}" style="background:#999">Bỏ khỏi yêu thích</a>
      </p>
    </article>
  `).join('');

  root.innerHTML = `<section class="grid products-grid" style="padding-top:0">${cards}</section>`;

  root.addEventListener('click', e=>{
    const btn = e.target.closest('.btn-remove-wish'); if(!btn) return;
    e.preventDefault(); wishlist.remove(btn.dataset.id); toast('Đã bỏ khỏi yêu thích'); renderWishlist(); updateHeaderCounts();
  });
})();

/* Login validation (giả lập) */
(function(){
  if(!/login\.html(\?|#|$)/.test(location.pathname)) return;
  const form = $('.login-form'); if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const user = form.user?.value?.trim(); const pass = form.password?.value||'';
    if(!user) return toast('Vui lòng nhập tên đăng nhập');
    if(pass.length<4) return toast('Mật khẩu tối thiểu 4 ký tự');
    setJSON(LS_KEYS.USER, { username:user, ts:Date.now() });
    toast('Đăng nhập thành công!');
    setTimeout(()=>location.href='index.html', 800);
  });
})();

/* Newsletter (chặn reload) */
(function(){
  $$('.newsletter').forEach(f=>{
    f.addEventListener('submit', e=>{
      e.preventDefault();
      const email = $('input[type="email"]', f)?.value?.trim();
      if(!email) return toast('Vui lòng nhập email');
      toast('Đăng ký bản tin thành công!'); $('input[type="email"]', f).value='';
    });
  });
})();
