import numpy as np, cv2, json
from common import *
T=np.load('tex.npy'); g=T[:,0]; t=T[:,1:][:,::-1]  # RGB
P=1450; step=10
us=np.arange(0,P,step); pal=[]
for u in us:
    vals=[np.array([np.interp(x,g,t[:,k]) for k in range(3)]) for x in u+P*np.arange(-1,3) if -330<=x<=3220]
    pal.append(np.mean(vals,0))
pal=np.array(pal)
# smooth cyclic
k=np.array([1,2,3,2,1],float); k/=k.sum()
pal=np.stack([np.convolve(np.r_[pal[-2:,c],pal[:,c],pal[:2,c]],k,'valid') for c in range(3)],1)
json.dump({'period':P,'step':step,'colors':['#%02x%02x%02x'%tuple(int(round(v)) for v in p) for p in pal]},open('palette.json','w'))
img=np.repeat(pal[None].astype(np.uint8),30,0); cv2.imwrite('palette.png',cv2.resize(img[:,:,::-1],(725,30)))
# apple phase
c,L=resample(cr(json.load(open('apple_pts.json'))),2); n=len(c); s=np.arange(n)*2.0
ok=np.ones(n,bool)
for i in range(n):
    d=np.linalg.norm(c-c[i],axis=1); far=np.abs(np.arange(n)-i)>30
    if (d[far]<44).any(): ok[i]=False
def palat(u): u=np.mod(u,P); return np.stack([np.interp(u,np.r_[us,P],np.r_[pal[:,k],pal[0,k]]) for k in range(3)],-1)
for f in [140,146]:
    im=cv2.imread(f'../hello/frames/f{f+1:03d}.png').astype(float)[:,:,::-1]
    pr=np.array([im[y-3:y+4,x-3:x+4].reshape(-1,3).mean(0) for x,y in c.round().astype(int)])
    res=[]
    for dirn in [1,-1]:
        for scale in [0.8,0.9,1.0,1.1,1.25]:
            for o in range(0,P,10):
                e=np.abs(palat(dirn*s*scale+o)[ok]-pr[ok]).mean(); res.append((e,dirn,scale,o))
    res.sort(); print(f,res[:3])
# hello check frame 80 error
c2,_=resample(cr(json.load(open('hello_pts.json'))),2)
