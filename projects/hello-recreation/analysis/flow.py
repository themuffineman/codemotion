import numpy as np, cv2, json
from common import *
c,L=resample(cr(json.load(open('hello_pts.json'))),2); n=len(c)
ok=np.ones(n,bool)
for i in range(n):
    d=np.linalg.norm(c-c[i],axis=1); far=np.abs(np.arange(n)-i)>30
    if (d[far]<44).any(): ok[i]=False
ix=c.round().astype(int)
def prof(f):
    im=cv2.imread(f'../hello/frames/f{f+1:03d}.png').astype(float)
    p=np.array([im[y-3:y+4,x-3:x+4].reshape(-1,3).mean(0) for x,y in ix]); p/= (p.sum(1,keepdims=True)+1)  # chromaticity
    return p
P={f:prof(f) for f in range(44,110,2)}
for dt in [2,4,6,10]:
    res=[]
    for f in range(46,106-dt,4):
        a,b=P[f],P[f+dt]; best=None
        for sh in range(-150,151,2):
            i=np.arange(n); j=i+sh; m=(j>=0)&(j<n); m&=ok; m[m]&=ok[j[m]]
            e=np.abs(a[i[m]]-b[j[m]]).sum(1).mean()
            if best is None or e<best[0]: best=(e,sh)
        res.append(best[1]*2)
    print('dt',dt,'shift px along path',res, 'median px/frame',np.median(res)/dt)
