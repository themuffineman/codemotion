import numpy as np, cv2, json, sys
from common import *
S=0.25; rng=np.random.default_rng(2)
def mask_frame(f,thr=110):
    v=cv2.imread(f'../hello/frames/f{f+1:03d}.png').max(2)
    return cv2.resize(v,None,fx=S,fy=S,interpolation=cv2.INTER_AREA)>thr
def proj(c,th,px,py,phi,F):
    k=np.array([np.sin(phi),np.cos(phi),0.0])
    v=np.stack([c[:,0]-px,c[:,1]-py,np.zeros(len(c))],1)
    vr=v*np.cos(th)+np.cross(k,v)*np.sin(th)+np.outer(v@k,k)*(1-np.cos(th))
    s=F/(F+vr[:,2]); return np.stack([640+(vr[:,0]+px-640)*s,360+(vr[:,1]+py-360)*s],1),s
def render(c,*a,R=20):
    P,s=proj(c,*a); im=np.zeros((180,320),np.uint8)
    cv2.polylines(im,[(P*S*8).astype(np.int32)],False,1,max(1,int(2*(R+8)*S*s.mean())),cv2.LINE_8,shift=3)
    return im>0
def iou(a,b): return (a&b).sum()/max(1,(a|b).sum())
name=sys.argv[1]; frames=list(map(int,sys.argv[2].split(','))); angs=np.radians(np.r_[np.arange(-90,0,3),np.arange(0,91,3)])
c,_=resample(cr(json.load(open(f'{name}_pts.json'))),3)
M={f:mask_frame(f) for f in frames}
def score(p):
    tot=0; th=[]
    for f in frames:
        b=max((iou(render(c,a,*p),M[f]),a) for a in angs); tot+=b[0]; th.append(round(np.degrees(b[1])))
    return tot/len(frames),th
best=(0,None,None)
for it in range(int(sys.argv[3])):
    if it<120: p=[rng.uniform(450,950),rng.uniform(250,500),rng.uniform(-0.6,0.6),rng.choice([700,1200,2000,4000])]
    else: q=best[1]; p=[q[0]+rng.normal(0,25),q[1]+rng.normal(0,25),q[2]+rng.normal(0,.06),max(300,q[3]*np.exp(rng.normal(0,.2)))]
    sc,th=score(p)
    if sc>best[0]: best=(sc,p,th); print(it,round(sc,4),[round(v,2) for v in p],th,flush=True)
