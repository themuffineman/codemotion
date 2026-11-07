import numpy as np, json
exec(open('letters_eval.py').read().split('def mono')[0])
FR2=FR+[129]
M[129]=mask(129)
def model(p,t):
    tk=np.maximum.accumulate(np.clip(p['turn'],0,89)); turn=lambda x: np.interp(x,[104,107,110,113,116,118,121,126,140],np.r_[0,tk,tk[-1]])
    pk=np.clip(p['pull'],0,1); pk=np.maximum.accumulate(pk); pull=lambda x: np.interp(x,[121,123,125,126,127,128,129,129.4],np.r_[0,pk,1])
    sl=np.radians(p['slant']); SX,SY=np.sin(sl),-np.cos(sl)
    X=np.zeros(n); Y=np.zeros(n)
    for k in range(5):
        cs=np.cos(np.radians(turn(t-p['stag']*k))); dx=c[:,0]-p['ax'][k]; dy=c[:,1]-340
        al=dx*SX+dy*SY; ac=(dx*SY-dy*SX)*cs; ax=p['ax'][k]+(p['sx']-p['ax'][k])*pull(t)
        X+=W[:,k]*(ax+al*SX+ac*SY); Y+=W[:,k]*(340+al*SY-ac*SX)
    return np.stack([X,Y],1)
def score(p): return np.mean([iou(render(model(p,f),np.ones(1)),M[f]) for f in FR2])
p={'turn':np.array([10.,30,55,74,80,84,86]),'pull':np.array([.1,.25,.4,.55,.72,.88]),'slant':14.,'stag':2.,'ax':np.array([380.,535,670,783,905]),'sx':665.}
best=score(p); print('start',round(best,4),flush=True)
steps={'turn':6.,'pull':.06,'slant':3.,'stag':.4,'ax':12.,'sx':15.}
for it in range(25):
    improved=False
    for key in steps:
        arr=np.atleast_1d(p[key]).astype(float)
        for i in range(len(arr)):
            for d in (steps[key],-steps[key]):
                q={k:(v.copy() if isinstance(v,np.ndarray) else v) for k,v in p.items()}
                if isinstance(p[key],np.ndarray): q[key][i]+=d
                else: q[key]=p[key]+d
                s=score(q)
                if s>best+1e-4: best,p=s,q; improved=True; break
    if not improved:
        for k in steps: steps[k]*=0.5
    print(it,round(best,4),{k:(np.round(v,2).tolist() if isinstance(v,np.ndarray) else round(v,2)) for k,v in p.items()},flush=True)
json.dump({k:(v.tolist() if isinstance(v,np.ndarray) else v) for k,v in p.items()},open('letters_fit.json','w'))
print('per frame',[round(iou(render(model(p,f),np.ones(1)),M[f]),2) for f in FR2])
