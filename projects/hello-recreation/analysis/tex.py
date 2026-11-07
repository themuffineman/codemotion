import numpy as np, cv2, json
from common import *
c,L=resample(cr(json.load(open('hello_pts.json'))),2); n=len(c); s=np.arange(n)*2.0
ok=np.ones(n,bool)
for i in range(n):
    d=np.linalg.norm(c-c[i],axis=1); far=np.abs(np.arange(n)-i)>30
    if (d[far]<44).any(): ok[i]=False
ix=c.round().astype(int)
v=lambda t: 8+(t-44)*0.08
def D(t): # displacement relative to frame 80
    ts=np.linspace(80,t,200); return np.trapezoid(v(ts),ts)
grid=np.arange(-900,3400,4.0); acc=np.zeros((len(grid),3)); cnt=np.zeros(len(grid))
for f in range(44,110,2):
    im=cv2.imread(f'../hello/frames/f{f+1:03d}.png').astype(float)
    p=np.array([im[y-3:y+4,x-3:x+4].reshape(-1,3).mean(0) for x,y in ix])
    u=s-D(f)
    k=np.round((u-grid[0])/4).astype(int)
    for kk,pp,o in zip(k,p,ok):
        if o and 0<=kk<len(grid): acc[kk]+=pp; cnt[kk]+=1
have=cnt>0; tex=np.zeros_like(acc); tex[have]=acc[have]/cnt[have,None]
print('coverage',grid[have].min(),grid[have].max(), have.mean())
# fill gaps by interpolation
for ch in range(3): tex[:,ch]=np.interp(grid,grid[have],tex[have,ch])
np.save('tex.npy',np.c_[grid,tex])
img=np.repeat(tex[None].astype(np.uint8),40,0)
# mark coverage
img[35:,~have]=0
for g in range(0,len(grid),125): img[:8,g]=255
cv2.imwrite('tex.png',cv2.resize(img,(1075,40),interpolation=cv2.INTER_AREA))
