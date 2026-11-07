import numpy as np, cv2, json, sys, time
from common import *
S=0.25; rng=np.random.default_rng(0)
c,_=resample(cr(json.load(open('hello_pts.json'))),3); n=len(c)
K=48; knots=np.linspace(0,n-1,K)
FR=[110,112,114,116,118,119,120,121,122,123,124,125,126,127,128]
def mask(f):
    v=cv2.imread(f'../hello/frames/f{f+1:03d}.png').max(2)
    return cv2.resize(v,None,fx=S,fy=S,interpolation=cv2.INTER_AREA)>50
M={f:mask(f) for f in FR}; M[90]=mask(90); M[60]=mask(60)
def zof(zk): return np.interp(np.arange(n),knots,zk)
def proj(z,th,px,F,tilt):
    # rotate about an axis through (px, 360) leaning by `tilt` radians in the picture plane
    x=c[:,0]-px; y=c[:,1]-360
    a=np.array([np.sin(tilt),np.cos(tilt),0.0])
    v=np.stack([x,y,z],1)
    vr=v*np.cos(th)+np.cross(a,v)*np.sin(th)+np.outer(v@a,a)*(1-np.cos(th))
    s=F/(F+vr[:,2])
    return np.stack([640+(vr[:,0]+px-640)*s,360+(vr[:,1])*s],1),s
def render(P,s,R=26):
    im=np.zeros((180,320),np.uint8)
    cv2.polylines(im,[(P*S*8).astype(np.int32)],False,1,int(2*(R+8)*S*s.mean()),cv2.LINE_8,shift=3)
    return im>0
def iou(a,b): return (a&b).sum()/max(1,(a|b).sum())
def score_frame(z,f,th,g): P,s=proj(z,th,*g); return iou(render(P,s),M[f])
def best_theta(z,f,g,center=None,span=None):
    grid=np.radians(np.arange(-89,90,3)) if center is None else center+np.radians(np.arange(-span,span+1,1))
    return max((score_frame(z,f,t,g),t) for t in grid)
def total(z,g,th):
    turn=np.mean([score_frame(z,f,th[f],g) for f in FR])
    rest=(score_frame(z,90,0,g)+score_frame(z,60,0,g))/2
    return 0.7*turn+0.3*rest-0.0004*np.abs(np.diff(z[::20])).mean()
g=[720.0,2000.0,0.0]
zk=np.zeros(K); z=zof(zk)
th={f:best_theta(z,f,g)[1] for f in FR}
base=total(z,g,th); print('flat baseline',round(base,4),'rest',round(score_frame(z,90,0,g),4),flush=True)
best=base; t0=time.time()
for it in range(60):
    step=40*(0.96**it)+4
    for k in rng.permutation(K):
        for d in (step,-step):
            zk2=zk.copy(); zk2[k]+=d; z2=zof(zk2)
            # refine angles a little for the new shape
            th2={f:best_theta(z2,f,g,th[f],2)[1] for f in FR}
            sc=total(z2,g,th2)
            if sc>best: best,zk,th=sc,zk2,th2; break
    # global params
    for gi,d in ((0,15),(1,300),(2,0.05)):
        for sgn in (1,-1):
            g2=list(g); g2[gi]+=sgn*d
            if g2[1]<400: continue
            z=zof(zk); th2={f:best_theta(z,f,g2,th[f],3)[1] for f in FR}
            sc=total(z,g2,th2)
            if sc>best: best,g,th=sc,g2,th2
    if it%5==4:
        z=zof(zk); th={f:best_theta(z,f,g)[1] for f in FR}; best=total(z,g,th)
        print(it,round(best,4),'g',[round(v,2) for v in g],'z range',round(zk.min()),round(zk.max()),'rest',round(score_frame(z,90,0,g),3),round(time.time()-t0),'s',flush=True)
json.dump({'turn':float(np.mean([score_frame(zof(zk),f,th[f],g) for f in FR])),'knots':knots.tolist(),'z':zk.tolist(),'g':g,'theta':{f:float(np.degrees(t)) for f,t in th.items()},'score':best,'flat':base},open('depthfit.json','w'))
print({f:round(np.degrees(t)) for f,t in th.items()})
