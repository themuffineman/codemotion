import numpy as np, cv2, json
from common import *
S=0.25
ctrl=np.array(json.load(open('hello_pts.json')),float)
c,_=resample(cr(ctrl),3); n=len(c)
bounds_ctrl=[30,50,71,91]  # last ctrl index of h,e,l1,l2
bidx=[int(np.argmin(np.linalg.norm(c-ctrl[k],axis=1))) for k in bounds_ctrl]
lab=np.zeros(n,int)
for b in bidx: lab[np.arange(n)>b]+=1
centres=np.array([380,535,670,783,905],float)
BL=12  # blend half-width in samples
def weights():
    W=np.zeros((n,5))
    for i in range(n):
        W[i,lab[i]]=1
    # blend around each boundary
    for k,b in enumerate(bidx):
        for i in range(max(0,b-BL),min(n,b+BL)):
            a=(i-(b-BL))/(2*BL); W[i]=0; W[i,k]=1-a; W[i,k+1]=a
    return W
W=weights()
def project(th,dx):
    X=np.zeros(n)
    for L in range(5):
        X+=W[:,L]*(centres[L]+dx[L]+(c[:,0]-centres[L])*np.cos(np.radians(th[L])))
    return np.stack([X,c[:,1]],1)
def render(P,R=26):
    im=np.zeros((180,320),np.uint8)
    cv2.polylines(im,[(P*S*8).astype(np.int32)],False,1,int(2*(R+8)*S),cv2.LINE_8,shift=3)
    return im>0
def mask(f):
    v=cv2.imread(f'../hello/frames/f{f+1:03d}.png').max(2)
    return cv2.resize(v,None,fx=S,fy=S,interpolation=cv2.INTER_AREA)>50
def iou(a,b): return (a&b).sum()/max(1,(a|b).sum())
th=np.zeros(5); dx=np.zeros(5); res={}
for f in range(104,130):
    M=mask(f)
    for sweep in range(3):
        for L in range(5):
            best=(-1,th[L],dx[L])
            for a in np.arange(th[L],min(90,th[L]+19),3):
                for d in np.arange(dx[L]-18,dx[L]+19,6):
                    t2=th.copy(); d2=dx.copy(); t2[L]=a; d2[L]=d
                    sc=iou(render(project(t2,d2)),M)
                    if sc>best[0]: best=(sc,a,d)
            th[L],dx[L]=best[1],best[2]
    sc=iou(render(project(th,dx)),M)
    res[f]=(th.tolist(),dx.tolist())
    print(f,round(sc,3),th.astype(int).tolist(),dx.astype(int).tolist(),flush=True)
json.dump({'centres':centres.tolist(),'bounds':bidx,'fit':res},open('letters.json','w'))
